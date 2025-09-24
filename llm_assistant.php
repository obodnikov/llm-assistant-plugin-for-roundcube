<?php

/**
 * LLM Assistant Plugin for Roundcube
 * 
 * Integrates AI assistant functionality into the compose page
 * Supports OpenAI GPT and other LLM providers
 *
 * @version 1.0
 * @author Your Name
 * @license GPL-3.0+
 */
class llm_assistant extends rcube_plugin
{
    public $task = 'mail';
    private $rc;

    public function init()
    {
        $this->rc = rcube::get_instance();
        
        // Debug logging
        rcube::write_log('console', '[LLM Assistant] Plugin init() called');
        
        // Load configuration
        $this->load_config();
        
        // Register hooks for all tasks initially
        $this->add_hook('startup', array($this, 'startup'));
        $this->add_hook('render_page', array($this, 'render_page'));
        
        // Register actions
        $this->register_action('plugin.llm_assistant.generate', array($this, 'generate_response'));
        
        // Add localization
        $this->add_texts('localization/', true);
        
        rcube::write_log('console', '[LLM Assistant] Plugin initialization complete');
    }

    /**
     * Startup hook - called on every request
     */
    public function startup($args)
    {
        rcube::write_log('console', '[LLM Assistant] Startup hook called - task: ' . $this->rc->task . ', action: ' . $this->rc->action);
        
        // Check if we're on a compose page
        if ($this->rc->task == 'mail' && ($this->rc->action == 'compose' || $this->rc->action == 'show')) {
            rcube::write_log('console', '[LLM Assistant] On compose-related page, adding assets');
            
            // Add CSS and JavaScript
            $this->include_stylesheet($this->local_skin_path() . '/llm_assistant.css');
            $this->include_script('llm_assistant.js');
            
            // Add assistant panel and button HTML
            $this->rc->output->add_footer($this->get_assistant_panel());
            $this->rc->output->add_footer($this->get_button_script());
            
            rcube::write_log('console', '[LLM Assistant] Assets added via startup hook');
        }
        
        return $args;
    }

    /**
     * Hook to modify page rendering
     */
    public function render_page($args)
    {
        rcube::write_log('console', '[LLM Assistant] render_page called with template: ' . $args['template']);
        
        if ($args['template'] == 'compose') {
            rcube::write_log('console', '[LLM Assistant] Adding assets to compose page');
            
            // Add CSS and JavaScript
            $this->include_stylesheet($this->local_skin_path() . '/llm_assistant.css');
            $this->include_script('llm_assistant.js');
            
            // Add assistant panel HTML to footer
            $panel_html = $this->get_assistant_panel();
            $this->rc->output->add_footer($panel_html);
            
            // IMPORTANT: Also add the button HTML directly to the page
            $button_script = $this->get_button_script();
            $this->rc->output->add_footer($button_script);
            
            rcube::write_log('console', '[LLM Assistant] Assets and panel added');
        }
        
        return $args;
    }

    /**
     * Hook to modify compose form - Alternative approach
     */
    public function compose_form($args)
    {
        rcube::write_log('console', '[LLM Assistant] compose_form hook called');
        
        // We'll add the button via JavaScript instead of modifying the form HTML
        // This is more reliable across different Roundcube versions and skins
        
        return $args;
    }

    /**
     * Generate AI response
     */
    public function generate_response()
    {
        try {
            rcube::write_log('console', '[LLM Assistant] Generate response called');
            
            $prompt = rcube_utils::get_input_value('prompt', rcube_utils::INPUT_POST);
            $context = rcube_utils::get_input_value('context', rcube_utils::INPUT_POST);
            $email_content = rcube_utils::get_input_value('email_content', rcube_utils::INPUT_POST);
            $action_type = rcube_utils::get_input_value('action_type', rcube_utils::INPUT_POST, 'reply');

            if (empty($prompt)) {
                rcube::write_log('console', '[LLM Assistant] Empty prompt provided');
                $this->rc->output->command('plugin.llm_assistant_response', array(
                    'success' => false,
                    'message' => 'Please enter a prompt'
                ));
                return;
            }

            $response = $this->call_llm_api($prompt, $context, $email_content, $action_type);
            
            $this->rc->output->command('plugin.llm_assistant_response', array(
                'success' => true,
                'content' => $response
            ));
            
        } catch (Exception $e) {
            rcube::write_log('errors', '[LLM Assistant] Exception: ' . $e->getMessage());
            
            $this->rc->output->command('plugin.llm_assistant_response', array(
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ));
        }
    }

    /**
     * Call LLM API (OpenAI or other provider)
     */
    private function call_llm_api($prompt, $context, $email_content, $action_type)
    {
        $api_provider = $this->rc->config->get('llm_assistant_provider', 'openai');
        $api_key = $this->rc->config->get('llm_assistant_api_key');
        $model = $this->rc->config->get('llm_assistant_model', 'gpt-3.5-turbo');

        if (empty($api_key)) {
            throw new Exception('API key not configured. Please check plugin configuration.');
        }

        // Prepare the system message based on action type
        $system_messages = array(
            'reply' => 'You are an email assistant. Help compose professional email replies based on the provided context and original email content.',
            'compose' => 'You are an email assistant. Help compose professional emails based on the user\'s requirements.',
            'improve' => 'You are an email assistant. Improve the provided email content while maintaining its intent and tone.',
            'summarize' => 'You are an email assistant. Provide a concise summary of the provided email content.',
            'translate' => 'You are an email assistant. Translate the provided content while maintaining professional email formatting.'
        );

        $system_message = isset($system_messages[$action_type]) ? 
            $system_messages[$action_type] : 
            $system_messages['reply'];

        // Build the message array
        $messages = array(
            array('role' => 'system', 'content' => $system_message)
        );

        if (!empty($email_content)) {
            $messages[] = array('role' => 'user', 'content' => 'Original email: ' . $email_content);
        }

        if (!empty($context)) {
            $messages[] = array('role' => 'user', 'content' => 'Context: ' . $context);
        }

        $messages[] = array('role' => 'user', 'content' => $prompt);

        if ($api_provider === 'openai') {
            return $this->call_openai_api($messages, $model, $api_key);
        } else {
            throw new Exception('Unsupported API provider: ' . $api_provider);
        }
    }

    /**
     * Call OpenAI API
     */
    private function call_openai_api($messages, $model, $api_key)
    {
        $data = array(
            'model' => $model,
            'messages' => $messages,
            'max_tokens' => (int)$this->rc->config->get('llm_assistant_max_tokens', 1000),
            'temperature' => (float)$this->rc->config->get('llm_assistant_temperature', 0.7)
        );

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json',
            'Authorization: Bearer ' . $api_key
        ));
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            $error_msg = 'Failed to connect to OpenAI API';
            if (!empty($curl_error)) {
                $error_msg .= ': ' . $curl_error;
            }
            throw new Exception($error_msg);
        }

        $decoded = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON response from API');
        }

        if ($http_code !== 200) {
            $error_msg = isset($decoded['error']['message']) ? 
                $decoded['error']['message'] : 
                'API request failed with HTTP code: ' . $http_code;
            throw new Exception($error_msg);
        }

        if (!isset($decoded['choices'][0]['message']['content'])) {
            throw new Exception('Invalid API response format');
        }

        return $decoded['choices'][0]['message']['content'];
    }

    /**
     * Get assistant panel HTML
     */
    private function get_assistant_panel()
    {
        return '
        <div id="llm-assistant-panel" style="display: none; position: fixed; top: 50px; right: 20px; width: 400px; max-height: 600px; background: #fff; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-family: Arial, sans-serif;">
            <div class="llm-assistant-header" style="padding: 12px 15px; background: #f8f9fa; border-bottom: 1px solid #ddd; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">AI Assistant</h3>
                <button id="llm-assistant-close" type="button" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666; padding: 0; width: 24px; height: 24px;">&times;</button>
            </div>
            <div class="llm-assistant-content" style="padding: 15px;">
                <div class="llm-assistant-actions" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                    <button type="button" class="llm-action-btn" data-action="reply" style="padding: 6px 12px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer; font-size: 12px;">Help Reply</button>
                    <button type="button" class="llm-action-btn" data-action="compose" style="padding: 6px 12px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer; font-size: 12px;">Help Compose</button>
                    <button type="button" class="llm-action-btn" data-action="improve" style="padding: 6px 12px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer; font-size: 12px;">Improve Text</button>
                    <button type="button" class="llm-action-btn" data-action="summarize" style="padding: 6px 12px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer; font-size: 12px;">Summarize</button>
                </div>
                <div class="llm-assistant-form">
                    <textarea id="llm-prompt" placeholder="Enter your request..." rows="3" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 10px; font-family: inherit; font-size: 13px; box-sizing: border-box;"></textarea>
                    <textarea id="llm-context" placeholder="Additional context (optional)..." rows="2" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 10px; font-family: inherit; font-size: 13px; box-sizing: border-box;"></textarea>
                    <div class="llm-assistant-buttons" style="display: flex; gap: 8px; margin-bottom: 15px;">
                        <button type="button" id="llm-generate" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; background: #007bff; color: white;">Generate</button>
                        <button type="button" id="llm-insert" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; background: #6c757d; color: white; display: none;">Insert Response</button>
                    </div>
                </div>
                <div id="llm-response" style="display: none; border: 1px solid #e9ecef; border-radius: 4px; padding: 12px; background: #f8f9fa;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #495057;">Generated Response:</h4>
                    <div id="llm-response-content" style="font-size: 13px; line-height: 1.5; color: #333; white-space: pre-wrap; max-height: 200px; overflow-y: auto;"></div>
                </div>
                <div id="llm-loading" style="display: none; text-align: center; padding: 20px; color: #6c757d; font-style: italic;">Generating response...</div>
                <div id="llm-error" style="display: none; background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; border: 1px solid #f5c6cb; font-size: 13px;"></div>
            </div>
        </div>';
    }

    /**
     * Get button script - Enhanced JavaScript to add the button
     */
    private function get_button_script()
    {
        return '
        <script type="text/javascript">
        // Wait for DOM and Roundcube to be ready
        $(document).ready(function() {
            console.log("[LLM Assistant] DOM ready, checking page type");
            
            // Check if we are on compose page by looking for compose elements
            var isComposePage = false;
            var composeIndicators = [
                "#compose-subject",
                "input[name=\'_subject\']", 
                "#composebody",
                "textarea[name=\'_message\']",
                ".compose-form",
                "#composeform"
            ];
            
            for (var i = 0; i < composeIndicators.length; i++) {
                if ($(composeIndicators[i]).length > 0) {
                    isComposePage = true;
                    console.log("[LLM Assistant] Compose page detected via: " + composeIndicators[i]);
                    break;
                }
            }
            
            if (!isComposePage) {
                console.log("[LLM Assistant] Not a compose page, skipping button insertion");
                return;
            }
            
            console.log("[LLM Assistant] Adding AI Assistant button");
            
            // Create the AI Assistant button
            var aiButton = $("<a>", {
                id: "llm-assistant-toggle",
                href: "#",
                title: "Toggle AI Assistant",
                text: "🤖 AI Assistant",
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
                    "box-shadow": "0 2px 4px rgba(0,0,0,0.2)"
                }
            });
            
            // Hover effect
            aiButton.hover(
                function() { $(this).css("background", "#138496"); },
                function() { $(this).css("background", "#17a2b8"); }
            );
            
            var inserted = false;
            
            // Try multiple insertion strategies
            var strategies = [
                // Strategy 1: Near form buttons
                function() {
                    var $formButtons = $(".formbuttons, .compose-buttons, .buttons");
                    if ($formButtons.length > 0) {
                        $formButtons.first().prepend(aiButton);
                        return "form buttons area";
                    }
                    return false;
                },
                
                // Strategy 2: Near send button
                function() {
                    var $sendBtn = $("#compose-send, .send-button, button[name=\'_send\']");
                    if ($sendBtn.length > 0) {
                        $sendBtn.first().before(aiButton);
                        return "near send button";
                    }
                    return false;
                },
                
                // Strategy 3: In toolbar area
                function() {
                    var $toolbar = $("#compose-toolbar, .toolbar, #composetoolbar");
                    if ($toolbar.length > 0) {
                        $toolbar.first().append(aiButton);
                        return "toolbar";
                    }
                    return false;
                },
                
                // Strategy 4: After subject field
                function() {
                    var $subject = $("#compose-subject, input[name=\'_subject\']");
                    if ($subject.length > 0) {
                        $subject.first().parent().after($("<div>").css("margin", "10px 0").append(aiButton));
                        return "after subject field";
                    }
                    return false;
                },
                
                // Strategy 5: At the beginning of compose form
                function() {
                    var $composeForm = $("#composeform, .compose-form, #compose-div");
                    if ($composeForm.length > 0) {
                        $composeForm.first().prepend($("<div>").css({"text-align": "right", "margin": "10px 0"}).append(aiButton));
                        return "top of compose form";
                    }
                    return false;
                }
            ];
            
            // Try each strategy
            for (var i = 0; i < strategies.length; i++) {
                var result = strategies[i]();
                if (result) {
                    console.log("[LLM Assistant] Button inserted at: " + result);
                    inserted = true;
                    break;
                }
            }
            
            if (!inserted) {
                // Final fallback: append to body with fixed positioning
                aiButton.css({
                    position: "fixed",
                    top: "10px",
                    right: "10px",
                    "z-index": "9999"
                });
                $("body").append(aiButton);
                console.log("[LLM Assistant] Button inserted as fixed element (fallback)");
            }
            
            console.log("[LLM Assistant] Button insertion complete. Button exists:", $("#llm-assistant-toggle").length > 0);
            
            // Add a small delay to ensure the panel exists before binding events
            setTimeout(function() {
                if (typeof window.llm_assistant !== "undefined" && window.llm_assistant.init) {
                    window.llm_assistant.init();
                }
            }, 500);
        });
        </script>';
    }
}
