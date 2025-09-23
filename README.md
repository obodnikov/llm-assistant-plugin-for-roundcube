# Roundcube LLM Assistant Plugin

An AI-powered assistant plugin for Roundcube webmail that integrates with OpenAI's ChatGPT and other LLM providers to help users compose, reply to, improve, and summarize emails.

## Features

- **Smart Email Composition**: Get AI assistance for writing new emails
- **Intelligent Replies**: Generate contextual responses to incoming emails
- **Content Improvement**: Enhance existing email drafts for clarity and professionalism
- **Email Summarization**: Create concise summaries of long email threads
- **Multiple LLM Support**: Currently supports OpenAI (ChatGPT), extensible for other providers
- **Page Content Reading**: Automatically reads current email content for context

## Installation

1. Extract the plugin to your Roundcube plugins directory:
   ```bash
   cd /path/to/roundcube/plugins/
   git clone [your-repo-url] llm_assistant
   ```

2. Copy the configuration file:
   ```bash
   cd llm_assistant
   cp config.inc.php.dist config.inc.php
   ```

3. Edit `config.inc.php` and add your OpenAI API key:
   ```php
   $config['llm_assistant_api_key'] = 'your-openai-api-key-here';
   ```

4. Enable the plugin in Roundcube's main configuration (`config/config.inc.php`):
   ```php
   $config['plugins'] = array('llm_assistant', /* other plugins */);
   ```

## Configuration

Edit `plugins/llm_assistant/config.inc.php`:

- `llm_assistant_provider`: API provider ('openai')
- `llm_assistant_api_key`: Your API key
- `llm_assistant_model`: Model to use (e.g., 'gpt-3.5-turbo', 'gpt-4')
- `llm_assistant_max_tokens`: Maximum response length (default: 1000)
- `llm_assistant_temperature`: Response creativity (0.0-1.0, default: 0.7)

## Usage

1. Open the compose page in Roundcube
2. Click the "AI Assistant" button in the toolbar
3. Choose an action:
   - **Help Reply**: Assist with replying to an email
   - **Help Compose**: Help write a new email
   - **Improve Text**: Enhance existing content
   - **Summarize**: Create a summary
4. Enter your request in the prompt field
5. Add any additional context if needed
6. Click "Generate" to get AI assistance
7. Review and insert the response into your email

## Requirements

- PHP 7.4 or higher
- Roundcube 1.5.0 or higher
- cURL extension for PHP
- Valid API key from supported LLM provider

## Security Considerations

- API keys are stored in server configuration files
- Email content is sent to the LLM provider's API
- Consider privacy implications for sensitive emails
- Use HTTPS for all communications

## License

GPL-3.0+