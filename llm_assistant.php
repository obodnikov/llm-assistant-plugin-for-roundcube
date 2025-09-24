<?php

/**
 * Improved LLM Assistant Plugin - Clean Separation of Concerns
 */
class llm_assistant extends rcube_plugin
{
    public $task = 'mail';
    private $rc;

    public function init()
    {
        $this->rc = rcube::get_instance();
        
        rcube::write_log('console', '[LLM Assistant] Plugin init() called');
        $this->load_config();
        
        $this->add_hook('startup', array($this, 'startup'));
        $this->add_hook('render_page', array($this, 'render_page'));
        $this->register_action('plugin.llm_assistant.generate', array($this, 'generate_response'));
        $this->add_texts('localization/', true);
        
        rcube::write_log('console', '[LLM Assistant] Plugin initialization complete');
    }

    public function startup($args)
    {
        if ($this->rc->task == 'mail' && ($this->rc->action == 'compose' || empty($this->rc->action))) {
            if (!isset($GLOBALS['llm_assistant_assets_loaded'])) {
                // Add CSS and JavaScript files
                $this->include_stylesheet($this->local_skin_path() . '/llm_assistant.css');
                $this->include_script('llm_assistant.js');
                
                // Add only the HTML panel - no JavaScript in PHP
                $this->rc->output->add_footer($this->get_assistant_panel());
                
                // Pass configuration to JavaScript via HTML data attributes or global JS variable
                $this->rc->output->add_footer($this->get_config_script());
                
                $GLOBALS['llm_assistant_assets_loaded'] = true;
                rcube::write_log('console', '[LLM Assistant] Assets added via startup hook');
            }
        }
        return $args;
    }

    public function render_page($args)
    {
        if ($args['template'] == 'compose' && !isset($GLOBALS['llm_assistant_assets_loaded'])) {
            $this->include_stylesheet($this->local_skin_path() . '/llm_assistant.css');
            $this->include_script('llm_assistant.js');
            $this->rc->output->add_footer($this->get_assistant_panel());
            $this->rc->output->add_footer($this->get_config_script());
            $GLOBALS['llm_assistant_assets_loaded'] = true;
        }
        return $args;
    }

    /**
     * Generate AI response - same as before
     */
    public function generate_response()
    {
        try {
            $prompt = rcube_utils::get_input_value('prompt', rcube_utils::INPUT_POST);
            $context = rcube_utils::get_input_value('context', rcube_utils::INPUT_POST);
            $email_content = rcube_utils::get_input_value('email_content', rcube_utils::INPUT_POST);
            $action_type = rcube_utils::get_input_value('action_type', rcube_utils::INPUT_POST, 'reply');

            if (empty($prompt)) {
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

    // ... (keep existing call_llm_api and call_openai_api methods)
    
    private function call_llm_api($prompt, $context, $email_content, $action_type)
    {
        $api_provider = $this->rc->config->get('llm_assistant_provider', 'openai');
        $api_key = $this->rc->config->get('llm_assistant_api_key');
        $model = $this->rc->config->get('llm_assistant_model', 'gpt-3.5-turbo');

        if (empty($api_key)) {
            throw new Exception('API key not configured. Please check plugin configuration.');
        }

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
     * Clean HTML panel - no JavaScript mixed in
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
                    <button type="button" class="llm-action-btn" data-action="reply" style="padding: 6px 12px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Help Reply</button>
                    <button type="button" class="llm-action-btn" data-action="compose" style="padding: 6px 12px; border: 1px solid #28a745; background: #28a745; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Help Compose</button>
                    <button type="button" class="llm-action-btn" data-action="improve" style="padding: 6px 12px; border: 1px solid #ffc107; background: #ffc107; color: #212529; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Improve Text</button>
                    <button type="button" class="llm-action-btn" data-action="summarize" style="padding: 6px 12px; border: 1px solid #6c757d; background: #6c757d; color: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Summarize</button>
                </div>
                <div class="llm-assistant-form">
                    <textarea id="llm-prompt" placeholder="Enter your request..." rows="3" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 10px; font-family: inherit; font-size: 13px; box-sizing: border-box; resize: vertical;"></textarea>
                    <textarea id="llm-context" placeholder="Additional context (optional)..." rows="2" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 10px; font-family: inherit; font-size: 13px; box-sizing: border-box; resize: vertical;"></textarea>
                    <div class="llm-assistant-buttons" style="display: flex; gap: 8px; margin-bottom: 15px;">
                        <button type="button" id="llm-generate" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; background: #007bff; color: white; font-weight: bold;">Generate</button>
                        <button type="button" id="llm-insert" style="padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; background: #28a745; color: white; display: none; font-weight: bold;">Insert Response</button>
                    </div>
                </div>
                <div id="llm-response" style="display: none; border: 1px solid #e9ecef; border-radius: 4px; padding: 12px; background: #f8f9fa; margin-bottom: 10px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #495057;">Generated Response:</h4>
                    <div id="llm-response-content" style="font-size: 13px; line-height: 1.5; color: #333; white-space: pre-wrap; max-height: 200px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 3px; padding: 8px; background: white;"></div>
                </div>
                <div id="llm-loading" style="display: none; text-align: center; padding: 20px; color: #6c757d; font-style: italic; background: #f1f3f4; border-radius: 4px; margin-bottom: 10px;">
                    <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>
                    Generating response...
                </div>
                <div id="llm-error" style="display: none; background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; border: 1px solid #f5c6cb; font-size: 13px; margin-bottom: 10px;"></div>
            </div>
        </div>
        
        <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .llm-action-btn:hover {
            opacity: 0.8;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .llm-action-btn.active {
            box-shadow: 0 0 0 3px rgba(0,123,255,0.25);
            transform: translateY(-2px);
        }
        
        #llm-generate:hover:not(:disabled) {
            background: #0056b3;
        }
        
        #llm-insert:hover {
            background: #218838;
        }
        
        #llm-assistant-close:hover {
            background: #e9ecef;
            border-radius: 3px;
        }
        </style>';
    }

    /**
     * Pass configuration to JavaScript - minimal and clean
     */
    private function get_config_script()
    {
        return '<script type="text/javascript">
        window.llm_assistant_config = {
            debug: true,
            labels: {
                "toggle_assistant": "' . $this->gettext('toggle_assistant') . '",
                "ai_assistant": "' . $this->gettext('ai_assistant') . '"
            }
        };
        </script>';
    }
}