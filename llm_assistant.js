<!-- JavaScript file: llm_assistant.js -->
<script>
$(document).ready(function() {
    var llm_assistant = {
        panel: null,
        current_action: 'reply',
        
        init: function() {
            this.panel = $('#llm-assistant-panel');
            this.bind_events();
        },
        
        bind_events: function() {
            var self = this;
            
            // Toggle assistant panel
            $('#llm-assistant-toggle').click(function(e) {
                e.preventDefault();
                self.toggle_panel();
            });
            
            // Close panel
            $('#llm-assistant-close').click(function() {
                self.hide_panel();
            });
            
            // Action buttons
            $('.llm-action-btn').click(function() {
                self.set_action($(this).data('action'));
                $(this).addClass('active').siblings().removeClass('active');
            });
            
            // Generate response
            $('#llm-generate').click(function() {
                self.generate_response();
            });
            
            // Insert response
            $('#llm-insert').click(function() {
                self.insert_response();
            });
            
            // Handle response from server
            rcmail.addEventListener('plugin.llm_assistant_response', function(data) {
                self.handle_response(data);
            });
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
            var prompt = $('#llm-prompt').val().trim();
            var context = $('#llm-context').val().trim();
            
            if (!prompt) {
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
            
            rcmail.http_post('plugin.llm_assistant.generate', {
                prompt: prompt,
                context: context,
                email_content: email_content,
                action_type: this.current_action
            });
        },
        
        handle_response: function(data) {
            this.hide_loading();
            
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
            
            // Insert into compose editor
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
    
    llm_assistant.init();
});
</script>