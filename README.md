# Roundcube LLM Assistant Plugin

An AI-powered assistant plugin for Roundcube webmail that integrates with OpenAI's ChatGPT and other LLM providers to help users compose, reply to, improve, and summarize emails.


## Key Features:

1. **AI Assistant Panel**: A floating panel that appears on the compose page with various AI actions
2. **Multiple Actions**:
   - Help Reply: Generate responses to emails
   - Help Compose: Assist with writing new emails  
   - Improve Text: Enhance existing draft content
   - Summarize: Create summaries of email content

3. **Page Reading Capability**: The plugin can read:
   - Current email content from the compose editor
   - Original email content from reply/forward contexts
   - Both TinyMCE and plain text editors are supported

## Key Features (continued):

4. **OpenAI Integration**: 
   - Supports ChatGPT models (GPT-3.5-turbo, GPT-4, etc.)
   - Configurable parameters (temperature, max tokens)
   - Extensible architecture for other LLM providers

5. **User Interface**:
   - Clean, modern design that integrates with Roundcube's elastic skin
   - Responsive design for mobile devices
   - Loading states and error handling
   - One-click insertion of generated content

## Installation Steps:

1. **Create Plugin Directory**:
   ```bash
   mkdir /path/to/roundcube/plugins/llm_assistant
   ```

2. **Save the Files**:
   - Save the main PHP code as `llm_assistant.php`
   - Extract the JavaScript code and save as `llm_assistant.js`
   - Create the other files from the second artifact:
     - `config.inc.php.dist`
     - `localization/en_US.inc`
     - `skins/elastic/llm_assistant.css`
     - `package.xml`
     - `composer.json`
     - `README.md`

3. **Configure the Plugin**:
   ```bash
   cp config.inc.php.dist config.inc.php
   # Edit config.inc.php and add your OpenAI API key
   ```

4. **Enable in Roundcube**:
   Add to `/path/to/roundcube/config/config.inc.php`:
   ```php
   $config['plugins'] = array('llm_assistant', /* other plugins */);
   ```

## Technical Architecture:

- **Backend**: PHP class that handles API calls, configuration, and server-side logic
- **Frontend**: JavaScript integration with Roundcube's compose interface
- **API Integration**: Secure cURL-based communication with OpenAI
- **Content Detection**: Smart parsing of email content from various editor types
- **Error Handling**: Comprehensive error reporting and user feedback

## Security Features:

- API keys stored server-side only
- Input validation and sanitization
- Timeout protection for API calls
- Error message filtering to prevent information leakage

## Extensibility:

The plugin is designed to easily support additional LLM providers. You can extend the `call_llm_api()` method to add support for:
- Anthropic Claude
- Google Bard/Gemini
- Local LLM endpoints
- Azure OpenAI
- Other API providers

## Usage Workflow:

1. User opens compose page
2. Clicks "AI Assistant" button to open the panel
3. Selects desired action (reply, compose, improve, summarize)
4. Enters prompt and optional context
5. Plugin reads current page content automatically
6. Sends request to configured LLM provider
7. Displays generated response
8. User can insert response into email with one click

The plugin provides a seamless integration that enhances email productivity while maintaining Roundcube's familiar interface and workflow.

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