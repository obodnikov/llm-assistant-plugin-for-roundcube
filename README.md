# Roundcube LLM Assistant Plugin

An AI-powered assistant plugin for Roundcube webmail that integrates with OpenAI's ChatGPT and other LLM providers to help users compose, reply to, improve, and summarize emails.

## ✨ Key Features

### 🤖 **AI-Powered Email Assistance**
1. **Help Reply**: Generate contextual responses to incoming emails
2. **Help Compose**: Assist with writing new emails from scratch  
3. **Improve Text**: Enhance existing draft content for clarity and professionalism
4. **Summarize**: Create concise summaries of long email content or threads

### 🎛️ **Interactive Movable & Resizable Panel**
- **Drag & Drop**: Move the assistant window anywhere on your screen by dragging the header
- **Resizable Interface**: Adjust window size by dragging the bottom-right corner
- **Smart Positioning**: Automatically keeps the panel within viewport bounds
- **Persistent State**: Remembers window position and size between sessions
- **Responsive Design**: Adapts to different screen sizes and mobile devices

### 🔗 **Smart Content Integration**
- **Page Reading Capability**: Automatically reads current email content from compose editor
- **Context Awareness**: Understands reply/forward contexts and original email content
- **Multi-Editor Support**: Works with both TinyMCE rich text and plain text editors
- **One-Click Insertion**: Insert generated content directly into your email with proper formatting

### 🚀 **Advanced Technical Features**
- **OpenAI Integration**: Full support for ChatGPT models (GPT-3.5-turbo, GPT-4, etc.)
- **Configurable Parameters**: Adjustable temperature, max tokens, and model selection
- **Extensible Architecture**: Ready for integration with other LLM providers
- **Secure API Communication**: Server-side API key storage with cURL-based requests
- **Comprehensive Error Handling**: User-friendly error messages and timeout protection

## 🎨 User Interface Features

### **Modern Design**
- Clean, professional interface that integrates seamlessly with Roundcube's elastic skin
- Smooth animations and hover effects for enhanced user experience
- Loading states with animated spinner during API calls
- Color-coded action buttons for different types of assistance

### **Window Management**
- **Movable Window**: Drag the header to reposition the assistant anywhere on screen
- **Resizable Panel**: Resize from 300px to 800px width, 200px to 600px height
- **Visual Feedback**: Header changes color during drag operations
- **Drag Handle**: Visual indicator (⋮⋮) shows the draggable area
- **Smart Boundaries**: Prevents window from being dragged completely off-screen

### **Responsive Behavior**
- **Desktop**: Full drag and resize functionality
- **Mobile/Tablet**: Automatically locks to screen edges for optimal touch interaction
- **Flexible Layout**: Content adapts to window size changes

## 📦 Installation

### **1. Extract Plugin Files**
```bash
cd /path/to/roundcube/plugins/
mkdir llm_assistant
# Copy all plugin files to this directory
```

### **2. File Structure**
```
llm_assistant/
├── llm_assistant.php          # Main plugin class
├── llm_assistant.js           # Frontend JavaScript with drag/resize
├── config.inc.php.dist        # Configuration template
├── package.xml                # Plugin metadata
├── composer.json              # Composer package info
├── README.md                  # This file
├── localization/
│   └── en_US.inc             # English translations
└── skins/
    └── elastic/
        └── llm_assistant.css  # Styling with drag/resize support
```

### **3. Configure the Plugin**
```bash
cd llm_assistant
cp config.inc.php.dist config.inc.php
# Edit config.inc.php and add your OpenAI API key
```

### **4. Enable in Roundcube**
Add to `/path/to/roundcube/config/config.inc.php`:
```php
$config['plugins'] = array('llm_assistant', /* other plugins */);
```

## ⚙️ Configuration Options

Edit `plugins/llm_assistant/config.inc.php`:

```php
// API Provider (currently supports 'openai')
$config['llm_assistant_provider'] = 'openai';

// Your OpenAI API Key
$config['llm_assistant_api_key'] = 'your-openai-api-key-here';

// Model Selection (gpt-3.5-turbo, gpt-4, gpt-4-turbo, etc.)
$config['llm_assistant_model'] = 'gpt-3.5-turbo';

// Maximum response length (tokens)
$config['llm_assistant_max_tokens'] = 1000;

// Response creativity (0.0 = focused, 1.0 = creative)
$config['llm_assistant_temperature'] = 0.7;
```
The `max_tokens` value of 1000 is a **moderate size** for AI responses. Let me explain what this means with practical examples:

## What are tokens?

Tokens are the basic units that AI models use to process text. Roughly:
- **1 token ≈ 0.75 words** (for English)
- **1000 tokens ≈ 750 words**
- **1000 tokens ≈ 3-4 paragraphs** of typical email content

## Practical Examples

### **1000 tokens can generate:**

**✅ Professional Reply (350 tokens):**
```
Dear Mr. Johnson,

Thank you for your email regarding the quarterly sales report. I appreciate you taking the time to review our performance metrics.

I'm pleased to confirm that we can schedule a meeting to discuss the findings in detail. Based on your availability, I suggest we meet next Tuesday, March 15th, at 2:00 PM in Conference Room B.

I'll prepare a comprehensive presentation covering the key insights, market trends, and our recommendations for Q2 strategy. Please let me know if you need any specific data points or analysis beforehand.

Looking forward to our discussion.

Best regards,
[Your name]
```

**✅ Email Composition (450 tokens):**
```
Subject: Partnership Proposal - Digital Marketing Services

Dear Ms. Rodriguez,

I hope this email finds you well. My name is [Name], and I'm reaching out from [Company] regarding a potential partnership opportunity that could benefit both our organizations.

We've been following your company's impressive growth in the e-commerce sector and believe our digital marketing expertise could help accelerate your expansion plans. Our agency specializes in:

• Search engine optimization (SEO)
• Pay-per-click advertising (PPC)  
• Social media marketing campaigns
• Content marketing strategies
• Analytics and performance tracking

We've helped similar companies in your industry increase their online revenue by 35-50% within the first six months of collaboration. I'd love to schedule a brief 30-minute call to discuss how we might work together.

Would you be available for a conversation next week? I'm flexible with timing and can accommodate your schedule.

Thank you for considering this opportunity. I look forward to hearing from you.

Best regards,
[Your signature]
```

### **1000 tokens is sufficient for:**
- ✅ Standard business emails
- ✅ Professional replies
- ✅ Meeting requests
- ✅ Project updates
- ✅ Customer service responses
- ✅ Follow-up emails
- ✅ Brief proposals

### **1000 tokens might be limiting for:**
- ❌ Long detailed reports
- ❌ Comprehensive proposals (5+ pages)
- ❌ Technical documentation
- ❌ Multi-topic newsletters
- ❌ Legal documents

## Configuration Recommendations

### **Conservative (Cost-effective):**
```php
$config['llm_assistant_max_tokens'] = 500;  // ~375 words
```
Good for: Quick replies, short emails, basic assistance

### **Balanced (Recommended):**
```php
$config['llm_assistant_max_tokens'] = 1000; // ~750 words  
```
Good for: Most business emails, standard communications

### **Generous:**
```php
$config['llm_assistant_max_tokens'] = 2000; // ~1500 words
```
Good for: Detailed emails, comprehensive responses, complex topics

### **Maximum:**
```php
$config['llm_assistant_max_tokens'] = 4000; // ~3000 words
```
Good for: Long-form content, detailed proposals, extensive documentation

## Cost Implications

With OpenAI's pricing (approximate):
- **GPT-3.5-turbo**: 1000 tokens ≈ $0.002
- **GPT-4**: 1000 tokens ≈ $0.03-0.06

So 1000 tokens is quite reasonable for regular use without breaking the budget.

## My Recommendation

**Keep 1000 tokens** as it provides a good balance between:
- ✅ Sufficient length for most email needs
- ✅ Reasonable API costs  
- ✅ Fast response times
- ✅ Practical for daily use

You can always increase it to 1500-2000 if you find yourself needing longer responses regularly.

## 🎯 Usage Guide

### **Getting Started**
1. Open any compose page in Roundcube
2. Click the **"🤖 AI Assistant"** button in the toolbar
3. The assistant panel will appear - you can now drag it anywhere on screen
4. Resize the panel by dragging the bottom-right corner to your preferred size

### **Using AI Actions**

#### **📧 Help Reply**
- Select "Help Reply" action
- The assistant automatically reads the original email content
- Enter your response requirements (e.g., "Write a polite decline")
- Click "Generate" and insert the response

#### **✍️ Help Compose**  
- Choose "Help Compose" for new emails
- Describe what you want to write (e.g., "Professional meeting request for next Tuesday")
- Generated content includes proper email structure and formatting

#### **✨ Improve Text**
- Select existing text in your draft
- Click "Improve Text"
- The assistant enhances clarity, tone, and professionalism
- Review and insert the improved version

#### **📝 Summarize**
- Use for long email threads or complex content
- Creates concise, actionable summaries
- Perfect for executive briefings or quick reviews

### **Window Management Tips**
- **Moving**: Click and drag the header to reposition
- **Resizing**: Drag the corner handle to adjust size
- **Boundaries**: Window automatically stays within screen bounds
- **Memory**: Position and size are remembered for next time

## 🔧 Technical Requirements

### **System Requirements**
- **PHP**: 7.4 or higher with cURL extension
- **Roundcube**: 1.5.0 or higher
- **Browser**: Modern browser with JavaScript enabled
- **API**: Valid OpenAI API key with sufficient credits

### **Server Configuration**
- HTTPS recommended for secure API communication
- Adequate timeout settings for API calls (30+ seconds)
- JSON support in PHP installation

## 🔒 Security & Privacy

### **Data Handling**
- **API Keys**: Stored securely in server-side configuration files
- **Email Content**: Sent to LLM provider's API for processing
- **No Local Storage**: Email content is not cached locally
- **HTTPS**: All API communications use encrypted connections

### **Privacy Considerations**
- Consider sensitivity of email content before using AI assistance
- Review your organization's data privacy policies
- OpenAI's data usage policies apply to processed content
- Recommended for non-confidential business communications

## 🔧 Advanced Configuration

### **Custom Model Settings**
```php
// For more creative responses
$config['llm_assistant_temperature'] = 0.9;

// For longer, more detailed responses
$config['llm_assistant_max_tokens'] = 2000;

// For faster, cost-effective operation
$config['llm_assistant_model'] = 'gpt-3.5-turbo';
```

### **Performance Optimization**
- Use `gpt-3.5-turbo` for faster responses and lower costs
- Adjust `max_tokens` based on your typical email length
- Lower `temperature` values (0.3-0.5) for more consistent, professional tone

## 🛠️ Extensibility

### **Adding New LLM Providers**
The plugin architecture supports additional AI providers:

```php
// Extend the call_llm_api() method
private function call_llm_api($prompt, $context, $email_content, $action_type) {
    $api_provider = $this->rc->config->get('llm_assistant_provider');
    
    switch($api_provider) {
        case 'openai':
            return $this->call_openai_api($messages, $model, $api_key);
        case 'anthropic':  // Add Claude support
            return $this->call_anthropic_api($messages, $model, $api_key);
        case 'google':     // Add Gemini support
            return $this->call_google_api($messages, $model, $api_key);
        // Add more providers...
    }
}
```

### **Custom Action Types**
Add new AI actions by extending the action buttons and system messages:

```php
$system_messages = array(
    'translate' => 'Translate the email content to the specified language',
    'formal' => 'Convert the email to a more formal business tone',
    'casual' => 'Make the email more casual and friendly'
);
```

## 🐛 Troubleshooting

### **Common Issues**

#### **Panel Not Appearing**
- Check browser console for JavaScript errors
- Verify you're on a compose page
- Ensure plugin is enabled in Roundcube config

#### **Drag/Resize Not Working**
- Check for JavaScript conflicts with other plugins
- Verify browser compatibility (modern browsers only)
- Clear browser cache and reload

#### **API Connection Issues**
- Verify API key is correctly configured
- Check server's outbound HTTPS connectivity
- Review server error logs for cURL errors

#### **Button Not Visible**
- Check CSS loading (inspect page source)
- Verify skin compatibility (tested with elastic skin)
- Try refreshing the page

### **Debug Mode**
Enable debug logging by setting:
```javascript
window.llm_assistant_config = {
    debug: true
};
```

Check browser console and server logs for detailed debugging information.

## 🆕 Version History

### **v1.1.0** (Latest)
- ✅ **NEW**: Movable and resizable assistant window
- ✅ **NEW**: Persistent window state (remembers position/size)
- ✅ **NEW**: Drag handle visual indicator
- ✅ **NEW**: Smart viewport boundary detection
- ✅ **NEW**: Enhanced mobile responsiveness
- ✅ **IMPROVED**: Better error handling and user feedback
- ✅ **IMPROVED**: Optimized CSS animations and transitions

### **v1.0.0**
- ✅ Initial release with basic AI assistance
- ✅ OpenAI integration
- ✅ Four core actions (Reply, Compose, Improve, Summarize)
- ✅ TinyMCE and plain text editor support

## 📄 License

**GPL-3.0+** - This plugin is free and open-source software.

## 🤝 Contributing

We welcome contributions! Please feel free to:
- Report bugs and suggest features
- Submit pull requests for improvements
- Help with documentation and translations
- Test with different Roundcube configurations

## 📞 Support

For support and questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Verify configuration settings
- Ensure API connectivity and valid credentials

---

**Made with ❤️ for the Roundcube community**

*Transform your email experience with AI-powered assistance that adapts to your workflow.*