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
        
        // Load configuration
        $this->load_config();
        
        // Register hooks
        $this->add_hook('render_page', array($this, 'render_page'));
        $this->add_hook('template_object_composeform', array($this, 'compose_form'));
        
        // Register actions
        $this->register_action('plugin.llm_assistant.generate', array($this, 'generate_response'));
        $this->register_action('plugin.llm_assistant.config', array($this, 'config_page'));
        
        // Add localization
        $this->add_texts('localization/', true);
    }

    /**
     * Hook to modify page rendering
     */
    public function render_page($args)
    {
        if ($args['template'] == 'compose') {
            // Add CSS and JavaScript
            $this->include_stylesheet($this->local_skin_path() . '/llm_assistant.css');
            $this->include_script('llm_assistant.js');
            
            // Add assistant panel HTML
            $this->rc->output->add_footer($this->get_assistant_panel());
        }
        return $args;
    }

    /**
     * Hook to modify compose form
     */
    public function compose_form($args)
    {
        // Add assistant button to compose toolbar
        $button = html::tag('a', array(
            'id' => 'llm-assistant-toggle',
            'class' => 'button',
            'href' => '#',
            'title' => $this->gettext('toggle_assistant')
        ), $this->gettext('ai_assistant'));

        $args['content'] = str_replace(
            '<div class="compose-options">',
            '<div class="compose-options">' . $button,
            $args['content']
        );

        return $args;
    }

    /**
     * Generate AI response
     */
    public function generate_response()
    {
        $prompt = rcube_utils::get_input_value('prompt', rcube_utils::INPUT_POST);
        $context = rcube_utils::get_input_value('context', rcube_utils::INPUT_POST);
        $email_content = rcube_utils::get_input_value('email_content', rcube_utils::INPUT_POST);
        $action_type = rcube_utils::get_input_value('action_type', rcube_utils::INPUT_POST, 'reply');

        if (empty($prompt)) {
            $this->rc->output->command('plugin.llm_assistant_response', array(
                'success' => false,
                'message' => $this->gettext('error_empty_prompt')
            ));
            return;
        }

        try {
            $response = $this->call_llm_api($prompt, $context, $email_content, $action_type);
            
            $this->rc->output->command('plugin.llm_assistant_response', array(
                'success' => true,
                'content' => $response
            ));
        } catch (Exception $e) {
            $this->rc->output->command('plugin.llm_assistant_response', array(
                'success' => false,
                'message' => $this->gettext('error_api_call') . ': ' . $e->getMessage()
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
            throw new Exception('API key not configured');
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
            // Add support for other providers here
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

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            throw new Exception('Failed to connect to OpenAI API');
        }

        $decoded = json_decode($response, true);

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
        <div id="llm-assistant-panel" style="display: none;">
            <div class="llm-assistant-header">
                <h3>' . $this->gettext('ai_assistant') . '</h3>
                <button id="llm-assistant-close" type="button">&times;</button>
            </div>
            <div class="llm-assistant-content">
                <div class="llm-assistant-actions">
                    <button type="button" class="llm-action-btn" data-action="reply">' . $this->gettext('help_reply') . '</button>
                    <button type="button" class="llm-action-btn" data-action="compose">' . $this->gettext('help_compose') . '</button>
                    <button type="button" class="llm-action-btn" data-action="improve">' . $this->gettext('improve_text') . '</button>
                    <button type="button" class="llm-action-btn" data-action="summarize">' . $this->gettext('summarize') . '</button>
                </div>
                <div class="llm-assistant-form">
                    <textarea id="llm-prompt" placeholder="' . $this->gettext('enter_prompt') . '" rows="3"></textarea>
                    <textarea id="llm-context" placeholder="' . $this->gettext('additional_context') . '" rows="2"></textarea>
                    <div class="llm-assistant-buttons">
                        <button type="button" id="llm-generate" class="btn btn-primary">' . $this->gettext('generate') . '</button>
                        <button type="button" id="llm-insert" class="btn btn-secondary" style="display: none;">' . $this->gettext('insert_response') . '</button>
                    </div>
                </div>
                <div id="llm-response" style="display: none;">
                    <h4>' . $this->gettext('generated_response') . '</h4>
                    <div id="llm-response-content"></div>
                </div>
                <div id="llm-loading" style="display: none;">' . $this->gettext('generating') . '</div>
                <div id="llm-error" style="display: none;" class="llm-error"></div>
            </div>
        </div>';
    }

    /**
     * Configuration page
     */
    public function config_page()
    {
        $this->rc->output->set_pagetitle($this->gettext('llm_assistant_config'));
        $this->rc->output->send('llm_assistant.config');
    }
}

?>