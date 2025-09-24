console.log('[LLM Assistant] JavaScript file loaded');

$(document).ready(function() {
    console.log('[LLM Assistant] DOM ready, initializing...');
    
    window.llm_assistant = {
        panel: null,
        current_action: 'reply',
        debug: true,
        
        init: function() {
            console.log('[LLM Assistant] Initializing assistant');
            this.panel = $('#llm-assistant-panel');
            
            if (this.panel.length === 0) {
                console.error('[LLM Assistant] Panel not found!');
                return;
            }
            
            this.bind_events();
            console.log('[LLM Assistant] Assistant initialized successfully');
        },
        
        log: function(message, data) {
            if (this.debug && console) {
                console.log('[LLM Assistant] ' + message, data || '');
            }
        },
        
        error: function(message, data) {
            if (console) {
                console.error('[LLM Assistant ERROR] ' + message, data || '');
            }
        },
        
        bind_events: function() {
            var self = this;
            
            // Toggle assistant panel
            $(document).on('click', '#llm-assistant-toggle', function(e) {
                e.preventDefault();
                self.toggle_panel();
            });
            
            // Close panel
            $(document).on('click', '#llm-assistant-close', function() {
                self.hide_panel();
            });
            
            // Action buttons
            $(document).on('click', '.llm-action-btn', function() {
                self.set_action($(this).data('action'));
                $(this).addClass('active').siblings().removeClass('active');
            });
            
            // Generate response
            $(document).on('click', '#llm-generate', function() {
                self.generate_response();
            });
            
            // Insert response
            $(document).on('click', '#llm-insert', function() {
                self.insert_response();
            });
            
            // Handle response from server
            if (typeof rcmail !== 'undefined') {
                rcmail.addEventListener('plugin.llm_assistant_response', function(data) {
                    self.handle_response(data);
                });
            }
        },
        
        toggle_panel: function() {
            if (this.panel.is(':visible')) {
                this.hide_panel();
            } else {
                this.show_panel();
            }
        },
        
        show_panel: function() {
            this.panel.show();
            $('#llm-prompt').focus();
        },
        
        hide_panel: function() {
            this.panel.hide();
        },
        
        set_action: function(action) {
            this.current_action = action;
            
            // Update prompt placeholder based on action
            var placeholders = {
                'reply': 'Describe how you want to reply to this email...',
                'compose': 'Describe the email you want to compose...',
                'improve': 'The text will be automatically improved',
                'summarize': 'The email content will be summarized'
            };
            
            $('#llm-prompt').attr('placeholder', placeholders[action] || '');
            
            // For improve and summarize, auto-fill with current email content
            if (action === 'improve' || action === 'summarize') {
                var current_content = this.get_email_content();
                if (current_content && action === 'improve') {
                    $('#llm-prompt').val('Please improve this email: ' + current_content);
                } else if (current_content && action === 'summarize') {
                    $('#llm-prompt').val('Please summarize this email');
                }
            }
        },
        
        get_email_content: function() {
            // Get content from compose editor
            var content = '';
            
            try {
                if (window.rcmail && rcmail.editor) {
                    if (rcmail.editor.editor) {
                        // TinyMCE editor
                        content = rcmail.editor.editor.getContent({format: 'text'});
                    } else {
                        // Plain text editor
                        content = rcmail.editor.get_content();
                    }
                } else {
                    // Fallback to textarea
                    var textarea = $('textarea[name="_message"]');
                    if (textarea.length) {
                        content = textarea.val();
                    }
                }
            } catch (e) {
                this.error('Error getting email content', e);
                // Fallback to textarea
                var textarea = $('textarea[name="_message"]');
                if (textarea.length) {
                    content = textarea.val();
                }
            }
            
            return content.trim();
        },
        
        get_original_email: function() {
            // Try to extract original email from quoted content
            var content = this.get_email_content();
            var lines = content.split('\n');
            var original_start = -1;
            
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].match(/^On .* wrote:$/) || 
                    lines[i].match(/^>/) ||
                    lines[i].match(/^From:/) ||
                    lines[i].match(/^-----Original Message-----/)) {
                    original_start = i;
                    break;
                }
            }
            
            if (original_start >= 0) {
                return lines.slice(original_start).join('\n');
            }
            
            return '';
        },
        
        generate_response: function() {
            var self = this;
            var prompt = $('#llm-prompt').val().trim();
            var context = $('#llm-context').val().trim();
            
            self.log('Generate response started', {
                prompt_length: prompt.length,
                context_length: context.length,
                action: this.current_action
            });
            
            if (!prompt) {
                self.error('Empty prompt');
                alert('Please enter a prompt');
                return;
            }
            
            this.show_loading();
            
            var email_content = '';
            if (this.current_action === 'reply') {
                email_content = this.get_original_email();
            } else if (this.current_action === 'improve' || this.current_action === 'summarize') {
                email_content = this.get_email_content();
            }
            
            self.log('Email content extracted', {
                email_content_length: email_content.length
            });
            
            // Make the AJAX request
            if (typeof rcmail !== 'undefined') {
                rcmail.http_post('plugin.llm_assistant.generate', {
                    prompt: prompt,
                    context: context,
                    email_content: email_content,
                    action_type: this.current_action
                });
            } else {
                this.error('Roundcube not available');
                this.hide_loading();
            }
        },
        
        handle_response: function(data) {
            this.hide_loading();
            
            this.log('Response received', data);
            
            if (data.success) {
                $('#llm-response-content').text(data.content);
                $('#llm-response').show();
                $('#llm-insert').show();
                $('#llm-error').hide();
            } else {
                $('#llm-error').text(data.message).show();
                $('#llm-response').hide();
                $('#llm-insert').hide();
            }
        },
        
        insert_response: function() {
            var response_content = $('#llm-response-content').text();
            
            if (!response_content) return;
            
            this.log('Inserting response', {length: response_content.length});
            
            // Insert into compose editor
            try {
                if (window.rcmail && rcmail.editor) {
                    if (rcmail.editor.editor) {
                        // TinyMCE editor
                        rcmail.editor.editor.insertContent(response_content);
                    } else {
                        // Plain text editor
                        var current_content = rcmail.editor.get_content();
                        rcmail.editor.set_content(current_content + '\n\n' + response_content);
                    }
                } else {
                    // Fallback to textarea
                    var textarea = $('textarea[name="_message"]');
                    if (textarea.length) {
                        var current_content = textarea.val();
                        textarea.val(current_content + '\n\n' + response_content);
                    }
                }
            } catch (e) {
                this.error('Error inserting response', e);
                // Fallback method
                var textarea = $('textarea[name="_message"]');
                if (textarea.length) {
                    var current_content = textarea.val();
                    textarea.val(current_content + '\n\n' + response_content);
                }
            }
            
            this.hide_panel();
        },
        
        show_loading: function() {
            $('#llm-loading').show();
            $('#llm-generate').prop('disabled', true);
            $('#llm-error').hide();
            $('#llm-response').hide();
            $('#llm-insert').hide();
        },
        
        hide_loading: function() {
            $('#llm-loading').hide();
            $('#llm-generate').prop('disabled', false);
        }
    };
    
    // Initialize immediately if panel exists, otherwise wait for button script
    if ($('#llm-assistant-panel').length > 0) {
        window.llm_assistant.init();
    }
    
    // Global error handler for uncaught JavaScript errors
    window.addEventListener('error', function(e) {
        console.error('[LLM Assistant] Uncaught error:', {
            message: e.message,
            source: e.filename,
            line: e.lineno,
            column: e.colno,
            error: e.error
        });
    });
});
