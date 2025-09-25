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
            
            // Initialize drag and resize functionality
            this.initDragAndResize();
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
            $(document).off('click', '#llm-assistant-close').on('click', '#llm-assistant-close', function(e) {
                e.stopPropagation(); // Prevent triggering drag
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
        
        initDragAndResize: function() {
            var self = this;
            console.log('[LLM Assistant] Initializing drag and resize functionality (Ubuntu/Gnome optimized)');
            
            // Load saved position and size
            this.loadPanelState();
            
            // Robust drag state management for Linux/Gnome compatibility
            var dragState = {
                active: false,
                startX: 0,
                startY: 0,
                startLeft: 0,
                startTop: 0,
                timeout: null,
                header: null
            };
            
            // Make panel draggable by header
            var header = $('.llm-assistant-header');
            dragState.header = header;
            
            header.on('mousedown', function(e) {
                // Don't drag if clicking the close button
                if ($(e.target).is('#llm-assistant-close') || $(e.target).closest('#llm-assistant-close').length) {
                    return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                
                console.log('[LLM Assistant] Starting drag (Ubuntu/Gnome optimized)');
                
                // Prevent any existing drag operations
                if (dragState.active) {
                    endDrag();
                    return;
                }
                
                dragState.active = true;
                dragState.startX = e.pageX;
                dragState.startY = e.pageY;
                
                var offset = self.panel.offset();
                dragState.startLeft = offset.left;
                dragState.startTop = offset.top;
                
                // Add visual feedback with forced cursor
                header.addClass('dragging');
                self.panel.css({
                    'pointer-events': 'none',
                    'z-index': '10001'
                });
                
                $('body').css({
                    'user-select': 'none',
                    '-webkit-user-select': 'none',
                    '-moz-user-select': 'none',
                    '-ms-user-select': 'none',
                    'cursor': 'move !important'
                });
                
                // Safety timeout to prevent infinite drag state
                dragState.timeout = setTimeout(function() {
                    if (dragState.active) {
                        console.warn('[LLM Assistant] Drag timeout reached, forcing end');
                        endDrag();
                    }
                }, 10000); // 10 second timeout
            });
            
            // Global mouse move handler
            $(document).on('mousemove', function(e) {
                if (!dragState.active) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                var deltaX = e.pageX - dragState.startX;
                var deltaY = e.pageY - dragState.startY;
                
                var newLeft = dragState.startLeft + deltaX;
                var newTop = dragState.startTop + deltaY;
                
                // Keep panel within viewport bounds with better boundary detection
                var windowWidth = $(window).width();
                var windowHeight = $(window).height();
                var panelWidth = self.panel.outerWidth();
                var panelHeight = self.panel.outerHeight();
                
                // Minimum 50px visible on each side
                newLeft = Math.max(-panelWidth + 100, Math.min(windowWidth - 100, newLeft));
                newTop = Math.max(0, Math.min(windowHeight - 100, newTop));
                
                self.panel.css({
                    left: newLeft + 'px',
                    top: newTop + 'px',
                    right: 'auto',
                    bottom: 'auto'
                });
            });
            
            // Robust drag end function
            function endDrag() {
                if (!dragState.active) return;
                
                console.log('[LLM Assistant] Ending drag (Ubuntu/Gnome optimized)');
                
                dragState.active = false;
                
                // Clear timeout
                if (dragState.timeout) {
                    clearTimeout(dragState.timeout);
                    dragState.timeout = null;
                }
                
                // Remove visual feedback with forced cursor reset
                if (dragState.header) {
                    dragState.header.removeClass('dragging');
                }
                
                self.panel.css({
                    'pointer-events': 'auto',
                    'z-index': '10000'
                });
                
                $('body').css({
                    'user-select': 'auto',
                    '-webkit-user-select': 'auto',
                    '-moz-user-select': 'auto',
                    '-ms-user-select': 'auto',
                    'cursor': 'auto'
                });
                
                // Force cursor reset on header
                if (dragState.header) {
                    dragState.header.css('cursor', 'move');
                }
                
                // Save the new position
                self.savePanelState();
                
                // Force a small delay to ensure mouse events are properly released (important for Gnome)
                setTimeout(function() {
                    $(document).trigger('mouseup');
                }, 10);
            }
            
            // Multiple end-drag triggers for better Linux/Gnome compatibility
            $(document).on('mouseup', endDrag);
            
            // Handle mouse leaving document area
            $(document).on('mouseleave', function(e) {
                if (dragState.active) {
                    console.log('[LLM Assistant] Mouse left document, ending drag');
                    endDrag();
                }
            });
            
            // Handle window blur (user switches to another app)
            $(window).on('blur', function(e) {
                if (dragState.active) {
                    console.log('[LLM Assistant] Window blur, ending drag');
                    endDrag();
                }
            });
            
            // ESC key handler to force-end dragging
            $(document).on('keydown', function(e) {
                if (e.keyCode === 27 && dragState.active) { // ESC key
                    console.log('[LLM Assistant] ESC pressed, ending drag');
                    endDrag();
                }
            });
            
            // Handle extreme mouse positions (cursor goes off screen)
            $(document).on('mousemove', function(e) {
                if (dragState.active) {
                    // If mouse coordinates are way outside reasonable bounds, end drag
                    if (e.pageX < -100 || e.pageY < -100 || 
                        e.pageX > $(window).width() + 100 || 
                        e.pageY > $(window).height() + 100) {
                        console.log('[LLM Assistant] Mouse position extreme, ending drag');
                        endDrag();
                    }
                }
            });
            
            // Prevent text selection during any drag operations
            $(document).on('selectstart dragstart', function(e) {
                if (dragState.active) {
                    e.preventDefault();
                    return false;
                }
            });
            
            // Save position and size when window is closed or refreshed
            $(window).on('beforeunload', function() {
                self.savePanelState();
            });
            
            // Handle window resize to keep panel in bounds
            $(window).on('resize', function() {
                self.keepPanelInBounds();
            });
            
            // Additional safety: check drag state every 5 seconds and reset if stuck
            setInterval(function() {
                if (dragState.active && dragState.timeout === null) {
                    console.warn('[LLM Assistant] Drag state stuck, resetting');
                    endDrag();
                }
            }, 5000);
        },
        
        savePanelState: function() {
            if (!this.panel || this.panel.length === 0) return;
            
            try {
                var state = {
                    left: this.panel.css('left'),
                    top: this.panel.css('top'),
                    width: this.panel.width(),
                    height: this.panel.height(),
                    isVisible: this.panel.is(':visible')
                };
                
                localStorage.setItem('llm_assistant_panel_state', JSON.stringify(state));
                console.log('[LLM Assistant] Panel state saved');
            } catch (e) {
                console.warn('[LLM Assistant] Could not save panel state:', e);
            }
        },
        
        loadPanelState: function() {
            try {
                var savedState = localStorage.getItem('llm_assistant_panel_state');
                if (!savedState) return;
                
                var state = JSON.parse(savedState);
                
                // Apply saved position and size
                if (state.left && state.left !== 'auto') {
                    this.panel.css({
                        left: state.left,
                        right: 'auto'
                    });
                }
                
                if (state.top && state.top !== 'auto') {
                    this.panel.css({
                        top: state.top,
                        bottom: 'auto'
                    });
                }
                
                if (state.width && state.width > 200) {
                    this.panel.width(state.width);
                }
                
                if (state.height && state.height > 150) {
                    this.panel.height(state.height);
                }
                
                // Ensure panel is still within bounds
                this.keepPanelInBounds();
                
                console.log('[LLM Assistant] Panel state loaded');
            } catch (e) {
                console.warn('[LLM Assistant] Could not load panel state:', e);
            }
        },
        
        keepPanelInBounds: function() {
            if (!this.panel || this.panel.length === 0 || !this.panel.is(':visible')) return;
            
            var windowWidth = $(window).width();
            var windowHeight = $(window).height();
            var panelWidth = this.panel.outerWidth();
            var panelHeight = this.panel.outerHeight();
            
            var currentPos = this.panel.offset();
            var newLeft = currentPos.left;
            var newTop = currentPos.top;
            
            // Adjust if panel is out of bounds
            if (newLeft + panelWidth > windowWidth) {
                newLeft = windowWidth - panelWidth - 20;
            }
            if (newLeft < 0) {
                newLeft = 20;
            }
            if (newTop + panelHeight > windowHeight) {
                newTop = windowHeight - panelHeight - 20;
            }
            if (newTop < 0) {
                newTop = 20;
            }
            
            // Only update if position changed
            if (newLeft !== currentPos.left || newTop !== currentPos.top) {
                this.panel.css({
                    left: newLeft + 'px',
                    top: newTop + 'px'
                });
            }
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
            this.keepPanelInBounds(); // Ensure it's in a good position
            $('#llm-prompt').focus();
        },
        
        hidePanel: function() {
            console.log('[LLM Assistant] Hiding panel');
            this.panel.hide();
            this.savePanelState(); // Save state when hiding
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
                // Format the response for better display
                var formatted_content = this.formatResponseForDisplay(data.content);
                $('#llm-response-content').html(formatted_content);
                $('#llm-response').show();
                $('#llm-insert').show();
                $('#llm-error').hide();
            } else {
                $('#llm-error').text(data.message).show();
                $('#llm-response').hide();
                $('#llm-insert').hide();
            }
        },
        
formatResponseForDisplay: function(content) {
            // Enhanced formatting for better display in the response panel
            var formatted = content
                // First, handle paragraph breaks (double line breaks)
                .replace(/\n\n+/g, '<br><br>')
                // Then handle single line breaks
                .replace(/\n/g, '<br>')
                // Format bold text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                // Format italic text
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                // Add proper spacing after sentence endings
                .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
                // Handle common email elements
                .replace(/(Subject:|Dear\s+[^,<]+,|Best\s+regards,|Sincerely,|Kind\s+regards)/gi, '<strong>$1</strong>')
                // Clean up multiple breaks
                .replace(/(<br>){3,}/g, '<br><br>');
            
            return formatted;
        },

        insertResponse: function() {
            // Get the formatted HTML content from the response panel
            var response_html = $('#llm-response-content').html();
            var response_text = $('#llm-response-content').text();
            
            if (!response_text) return;
            
            console.log('[LLM Assistant] Inserting formatted response');
            
            try {
                if (window.rcmail && rcmail.editor) {
                    if (rcmail.editor.editor) {
                        // TinyMCE editor - insert the formatted HTML directly
                        // Convert <br> tags to proper paragraphs for better structure
                        var formatted_html = response_html
                            .replace(/<br><br>/g, '</p><p>')
                            .replace(/^/, '<p>')
                            .replace(/$/, '</p>')
                            .replace(/<p><\/p>/g, ''); // Remove empty paragraphs
                        
                        rcmail.editor.editor.insertContent('<br><br>' + formatted_html);
                    } else {
                        // Plain text editor - convert HTML back to properly formatted text
                        var formatted_text = response_html
                            .replace(/<br><br>/g, '\n\n')
                            .replace(/<br>/g, '\n')
                            .replace(/<strong>(.*?)<\/strong>/g, '$1')
                            .replace(/<em>(.*?)<\/em>/g, '$1')
                            .replace(/<[^>]*>/g, ''); // Strip remaining HTML tags
                        
                        var current_content = rcmail.editor.get_content();
                        rcmail.editor.set_content(current_content + '\n\n' + formatted_text);
                    }
                } else {
                    // Fallback to textarea - use formatted text
                    var formatted_text = response_html
                        .replace(/<br><br>/g, '\n\n')
                        .replace(/<br>/g, '\n')
                        .replace(/<strong>(.*?)<\/strong>/g, '$1')
                        .replace(/<em>(.*?)<\/em>/g, '$1')
                        .replace(/<[^>]*>/g, ''); // Strip remaining HTML tags
                    
                    var textarea = $('textarea[name="_message"]');
                    if (textarea.length) {
                        var current_content = textarea.val();
                        textarea.val(current_content + '\n\n' + formatted_text);
                    }
                }
            } catch (e) {
                console.error('[LLM Assistant] Error inserting response:', e);
                // Fallback method - use the formatted text
                var formatted_text = response_html
                    .replace(/<br><br>/g, '\n\n')
                    .replace(/<br>/g, '\n')
                    .replace(/<strong>(.*?)<\/strong>/g, '$1')
                    .replace(/<em>(.*?)<\/em>/g, '$1')
                    .replace(/<[^>]*>/g, '');
                
                var textarea = $('textarea[name="_message"]');
                if (textarea.length) {
                    var current_content = textarea.val();
                    textarea.val(current_content + '\n\n' + formatted_text);
                }
            }
            
            this.hidePanel();
        },
        
        structureText: function(text) {
            // Clean up the text and add proper structure
            var structured = text
                // Remove excessive whitespace
                .replace(/\s+/g, ' ')
                .trim()
                // Ensure proper spacing after punctuation
                .replace(/([.!?])([A-Z])/g, '$1 $2')
                // Add line breaks before common sentence starters and transitions
                .replace(/([.!?])\s+(However,|Moreover,|Furthermore,|Additionally,|Therefore,|Consequently,|In conclusion,|Finally,|Best regards,|Sincerely,|Kind regards,|Thank you)/gi, '$1\n\n$2')
                // Add line breaks before "Dear" if it appears
                .replace(/(^|\s)(Dear\s+[^,]+,)/gi, '\n\n$2')
                // Add line breaks before "Subject:" if it appears
                .replace(/(^|\s)(Subject:\s*)/gi, '\n\n$2')
                // Handle email signatures and closings
                .replace(/([.!?])\s+(Best\s+regards|Sincerely|Kind\s+regards|Thank\s+you|Yours\s+truly)/gi, '$1\n\n$2')
                // Add paragraph breaks for long sentences (more than 100 characters ending with period)
                .replace(/([.!?])\s+([A-Z][^.!?]{100,})/g, '$1\n\n$2')
                // Clean up multiple line breaks
                .replace(/\n{3,}/g, '\n\n')
                .trim();
            
            return structured;
        },
        
        textToHtml: function(text) {
            // Convert structured text to HTML for rich text editor
            var html = text
                // Escape HTML characters
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                // Convert line breaks to HTML
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            
            // Wrap in paragraphs
            html = '<p>' + html + '</p>';
            
            // Clean up empty paragraphs
            html = html.replace(/<p><\/p>/g, '');
            
            return html;
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
