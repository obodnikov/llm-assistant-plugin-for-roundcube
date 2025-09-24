console.log('[LLM Assistant] JavaScript file loaded');

$(document).ready(function() {
    console.log('[LLM Assistant] DOM ready, initializing...');
    
    // Configuration from PHP
    var config = window.llm_assistant_config || {
        debug: true,
        labels: {
            "toggle_assistant": "Toggle AI Assistant",
            "ai_assistant": "AI Assistant"
        }
    };
    
    var llm_assistant = {
        panel: null,
        current_action: 'reply',
        button: null,
        debug: config.debug,
        
        init: function() {
            console.log('[LLM Assistant] Initializing assistant');
            
            // Find or create the button first
            this.initButton();
            
            // Then initialize the panel
            this.initPanel();
        },
        
        initButton: function() {
            console.log('[LLM Assistant] Initializing button');
            
            // Check if button already exists
            if ($("#llm-assistant-toggle").length > 0) {
                console.log('[LLM Assistant] Button already exists');
                this.button = $("#llm-assistant-toggle");
                this.bindButtonEvents();
                return;
            }
            
            // Check if we're on a compose page
            if (!this.isComposePage()) {
                console.log('[LLM Assistant] Not a compose page, skipping button creation');
                return;
            }
            
            // Create the button
            this.createButton();
            this.bindButtonEvents();
        },
        
        isComposePage: function() {
            var indicators = [
                "#compose-subject",
                "input[name='_subject']", 
                "#composebody",
                "textarea[name='_message']",
                ".compose-form",
                "#composeform"
            ];
            
            for (var i = 0; i < indicators.length; i++) {
                if ($(indicators[i]).length > 0) {
                    console.log('[LLM Assistant] Compose page detected via:', indicators[i]);
                    return true;
                }
            }
            return false;
        },
        
        createButton: function() {
            console.log('[LLM Assistant] Creating AI Assistant button');
            
            this.button = $("<a>", {
                id: "llm-assistant-toggle",
                href: "#",
                title: config.labels.toggle_assistant,
                html: "🤖 " + config.labels.ai_assistant,
                css: {
                    background: "#17a2b8",
                    color: "white",
                    "margin": "0 5px 5px 0",
                    padding: "8px 12px",
                    "border-radius": "4px",
                    "text-decoration": "none",
                    "font-size": "13px",
                    display: "inline-block",
                    "font-weight": "bold",
                    "box-shadow": "0 2px 4px rgba(0,0,0,0.2)",
                    transition: "all 0.2s ease"
                }
            });
            
            // Add hover effects
            this.button.hover(
                function() { 
                    $(this).css({
                        "background": "#138496",
                        "transform": "translateY(-1px)",
                        "box-shadow": "0 4px 8px rgba(0,0,0,0.3)"
                    }); 
                },
                function() { 
                    $(this).css({
                        "background": "#17a2b8",
                        "transform": "translateY(0)",
                        "box-shadow": "0 2px 4px rgba(0,0,0,0.2)"
                    }); 
                }
            );
            
            // Try to insert the button in the best location
            this.insertButton();
        },
        
        insertButton: function() {
            var strategies = [
                {
                    name: "near send button",
                    fn: function(button) {
                        var $sendBtn = $("#compose-send, .send-button, button[name='_send'], .btn.send");
                        if ($sendBtn.length > 0) {
                            $sendBtn.first().before(button);
                            return true;
                        }
                        return false;
                    }
                },
                {
                    name: "form buttons area",
                    fn: function(button) {
                        var $formButtons = $(".formbuttons, .compose-buttons, .buttons");
                        if ($formButtons.length > 0) {
                            $formButtons.first().prepend(button);
                            return true;
                        }
                        return false;
                    }
                },
                {
                    name: "toolbar",
                    fn: function(button) {
                        var $toolbar = $("#compose-toolbar, .toolbar, #composetoolbar");
                        if ($toolbar.length > 0) {
                            $toolbar.first().append(button);
                            return true;
                        }
                        return false;
                    }
                },
                {
                    name: "fixed position fallback",
                    fn: function(button) {
                        button.css({
                            position: "fixed",
                            top: "10px",
                            right: "10px",
                            "z-index": "9999"
                        });
                        $("body").append(button);
                        return true;
                    }
                }
            ];
            
            for (var i = 0; i < strategies.length; i++) {
                if (strategies[i].fn(this.button)) {
                    console.log('[LLM Assistant] Button inserted at:', strategies[i].name);
                    return;
                }
            }
        },
        
        bindButtonEvents: function() {
            var self = this;
            
            this.button.off('click').on('click', function(e) {
                e.preventDefault();
                console.log('[LLM Assistant] Button clicked');
                self.togglePanel();
            });
        },
        
        initPanel: function() {
            console.log('[LLM Assistant] Initializing panel');
            this.panel = $('#llm-assistant-panel');
            
            if (this.panel.length === 0) {
                console.error('[LLM Assistant] Panel not found in DOM!');
                return;
            }
            
            console.log('[LLM Assistant] Panel found, binding panel events');
            this.bindPanelEvents();
        },
        
        bindPanelEvents: function() {
            var self = this;
            
            // Close panel
            $(document).off('click', '#llm-assistant-close').on('click', '#llm-assistant-close', function() {
                self.hidePanel();
            });
            
            // Action buttons
            $(document).off('click', '.llm-action-btn').on('click', '.llm-action-btn', function() {
                self.setAction($(this).data('action'));
                $(this).addClass('active').siblings().removeClass('active');
            });
            
            // Generate response
            $(document).off('click', '#llm-generate').on('click', '#llm-generate', function() {
                self.generateResponse();
            });
            
            // Insert response
            $(document).off('click', '#llm-insert').on('click', '#llm-insert', function() {
                self.insertResponse();
            });
            
            // Handle response from server
            if (typeof rcmail !== 'undefined') {
                rcmail.removeEventListener('plugin.llm_assistant_response'); // Prevent duplicates
                rcmail.addEventListener('plugin.llm_assistant_response', function(data) {
                    self.handleResponse(data);
                });
            }
            
            console.log('[LLM Assistant] Panel events bound successfully');
        },
        
        togglePanel: function() {
            if (!this.panel || this.panel.length === 0) {
                console.error('[LLM Assistant] Cannot toggle panel - panel not found');
                return;
            }
            
            if (this.panel.is(':visible')) {
                this.hidePanel();
            } else {
                this.showPanel();
            }
        },
        
        showPanel: function() {
            console.log('[LLM Assistant] Showing panel');
            this.panel.show();
            $('#llm-prompt').focus();
        },
        
        hidePanel: function() {
            console.log('[LLM Assistant] Hiding panel');
            this.panel.hide();
        },
        
        setAction: function(action) {
            console.log('[LLM Assistant] Setting action to:', action);
            this.current_action = action;
            
            var placeholders = {
                'reply': 'Describe how you want to reply to this email...',
                'compose': 'Describe the email you want to compose...',
                'improve': 'The text will be automatically improved',
                'summarize': 'The email content will be summarized'
            };
            
            $('#llm-prompt').attr('placeholder', placeholders[action] || '');
            
            if (action === 'improve' || action === 'summarize') {
                var current_content = this.getEmailContent();
                if (current_content && action === 'improve') {
                    $('#llm-prompt').val('Please improve this email: ' + current_content);
                } else if (current_content && action === 'summarize') {
                    $('#llm-prompt').val('Please summarize this email');
                }
            }
        },
        
        getEmailContent: function() {
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
                console.error('[LLM Assistant] Error getting email content:', e);
                // Fallback to textarea
                var textarea = $('textarea[name="_message"]');
                if (textarea.length) {
                    content = textarea.val();
                }
            }
            
            return content.trim();
        },
        
        getOriginalEmail: function() {
            var content = this.getEmailContent();
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
        
        generateResponse: function() {
            var prompt = $('#llm-prompt').val().trim();
            var context = $('#llm-context').val().trim();
            
            console.log('[LLM Assistant] Generate response started');
            
            if (!prompt) {
                alert('Please enter a prompt');
                return;
            }
            
            this.showLoading();
            
            var email_content = '';
            if (this.current_action === 'reply') {
                email_content = this.getOriginalEmail();
            } else if (this.current_action === 'improve' || this.current_action === 'summarize') {
                email_content = this.getEmailContent();
            }
            
            // Make the AJAX request
            if (typeof rcmail !== 'undefined') {
                rcmail.http_post('plugin.llm_assistant.generate', {
                    prompt: prompt,
                    context: context,
                    email_content: email_content,
                    action_type: this.current_action
                });
            } else {
                console.error('[LLM Assistant] Roundcube not available');
                this.hideLoading();
            }
        },
        
        handleResponse: function(data) {
            this.hideLoading();
            console.log('[LLM Assistant] Response received:', data.success);
            
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
        
        insertResponse: function() {
            var response_content = $('#llm-response-content').text();
            
            if (!response_content) return;
            
            console.log('[LLM Assistant] Inserting response');
            
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
                console.error('[LLM Assistant] Error inserting response:', e);
                // Fallback method
                var textarea = $('textarea[name="_message"]');
                if (textarea.length) {
                    var current_content = textarea.val();
                    textarea.val(current_content + '\n\n' + response_content);
                }
            }
            
            this.hidePanel();
        },
        
        showLoading: function() {
            $('#llm-loading').show();
            $('#llm-generate').prop('disabled', true);
            $('#llm-error').hide();
            $('#llm-response').hide();
            $('#llm-insert').hide();
        },
        
        hideLoading: function() {
            $('#llm-loading').hide();
            $('#llm-generate').prop('disabled', false);
        }
    };
    
    // Initialize the assistant when DOM is ready
    // Add a small delay to ensure all HTML is loaded
    setTimeout(function() {
        console.log('[LLM Assistant] Starting initialization...');
        llm_assistant.init();
    }, 100);
    
    // Make assistant globally accessible for debugging
    window.llm_assistant = llm_assistant;
    
    // Global error handler
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