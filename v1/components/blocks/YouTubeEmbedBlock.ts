import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface YouTubeEmbedData extends BlockToolData {
  url: string;
  videoId: string;
  title?: string;
  caption?: string;
  autoplay: boolean;
  controls: boolean;
  privacyMode: boolean;
  startTime?: number; // Start time in seconds
}

export interface YouTubeEmbedConfig {
  allowAutoplay?: boolean;
  defaultPrivacyMode?: boolean;
  showAdvancedOptions?: boolean;
  placeholder?: string;
}

interface YouTubeEmbedConstructorArgs {
  data: YouTubeEmbedData;
  config?: YouTubeEmbedConfig;
  api: API;
  readOnly: boolean;
}

export default class YouTubeEmbedBlock implements BlockTool {
  private api: API;
  private data: YouTubeEmbedData;
  private readOnly: boolean;
  private config: YouTubeEmbedConfig;
  private wrapper: HTMLElement | null = null; // Store reference to this block's wrapper

  static get toolbox(): ToolboxConfig {
    return {
      title: 'YouTube Video',
      icon: `<svg width="17" height="15" viewBox="0 0 17 15" fill="none">
        <rect x="1" y="2" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M7 9.5L11 7L7 4.5V9.5Z" fill="currentColor"/>
      </svg>`
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  constructor({ data, config, api, readOnly }: YouTubeEmbedConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    this.data = {
      url: data.url || '',
      videoId: data.videoId || '',
      title: data.title || '',
      caption: data.caption || '',
      autoplay: data.autoplay ?? false,
      controls: data.controls ?? true,
      privacyMode: data.privacyMode ?? (this.config.defaultPrivacyMode ?? true),
      startTime: data.startTime || undefined
    };
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['youtube-embed-block']);
    this.wrapper = wrapper; // Store reference to this block's wrapper
    
    if (!this.readOnly) {
      this._renderControls(wrapper);
    }
    
    this._renderVideo(wrapper);
    
    return wrapper;
  }

  private _renderControls(wrapper: HTMLElement): void {
    const controls = this._make('div', ['youtube-embed-block__controls']);
    
    // URL Input
    const urlInput = this._make('input', ['youtube-embed-block__url-input'], {
      type: 'text',
      placeholder: this.config.placeholder || 'Paste YouTube URL here...',
      value: this.data.url
    });
    
    urlInput.addEventListener('input', (e) => {
      const url = (e.target as HTMLInputElement).value;
      this._handleUrlChange(url);
    });
    
    urlInput.addEventListener('paste', (e) => {
      // Handle paste with a small delay to get the pasted content
      setTimeout(() => {
        const url = (e.target as HTMLInputElement).value;
        this._handleUrlChange(url);
      }, 10);
    });
    
    controls.appendChild(urlInput);
    
    // Advanced Options (if enabled)
    if (this.config.showAdvancedOptions !== false) {
      const optionsContainer = this._make('div', ['youtube-embed-block__options']);
      
      // Privacy Mode Toggle
      const privacyToggle = this._createToggle('privacyMode', 'Privacy mode (youtube-nocookie.com)', this.data.privacyMode);
      optionsContainer.appendChild(privacyToggle);
      
      // Controls Toggle
      const controlsToggle = this._createToggle('controls', 'Show player controls', this.data.controls);
      optionsContainer.appendChild(controlsToggle);
      
      // Autoplay Toggle (if allowed)
      if (this.config.allowAutoplay !== false) {
        const autoplayToggle = this._createToggle('autoplay', 'Autoplay video', this.data.autoplay);
        optionsContainer.appendChild(autoplayToggle);
      }
      
      // Start Time Input
      const startTimeContainer = this._make('div', ['youtube-embed-block__start-time']);
      const startTimeLabel = this._make('label');
      startTimeLabel.textContent = 'Start time (seconds): ';
      const startTimeInput = this._make('input', ['youtube-embed-block__start-time-input'], {
        type: 'number',
        min: '0',
        placeholder: '0',
        value: this.data.startTime?.toString() || ''
      });
      
      startTimeInput.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        this.data.startTime = isNaN(value) ? undefined : value;
        this._updateEmbed();
      });
      
      startTimeContainer.appendChild(startTimeLabel);
      startTimeContainer.appendChild(startTimeInput);
      optionsContainer.appendChild(startTimeContainer);
      
      controls.appendChild(optionsContainer);
    }
    
    wrapper.appendChild(controls);
  }

  private _createToggle(property: keyof YouTubeEmbedData, label: string, checked: boolean): HTMLElement {
    const container = this._make('label', ['youtube-embed-block__toggle']);
    const checkbox = this._make('input', null, {
      type: 'checkbox',
      checked
    });
    const labelText = this._make('span');
    labelText.textContent = ` ${label}`;
    
    checkbox.addEventListener('change', (e) => {
      (this.data as any)[property] = (e.target as HTMLInputElement).checked;
      this._updateEmbed();
    });
    
    container.appendChild(checkbox);
    container.appendChild(labelText);
    
    return container;
  }

  private _renderVideo(wrapper: HTMLElement): void {
    const videoContainer = this._make('div', ['youtube-embed-block__video']);
    
    if (!this.data.videoId) {
      const placeholder = this._make('div', ['youtube-embed-block__placeholder']);
      placeholder.innerHTML = '📺 Enter a YouTube URL above to embed a video';
      videoContainer.appendChild(placeholder);
    } else {
      // Create responsive iframe container
      const iframeContainer = this._make('div', ['youtube-embed-block__iframe-container']);
      const iframe = this._make('iframe', ['youtube-embed-block__iframe'], {
        src: this._getEmbedUrl(),
        frameborder: '0',
        allowfullscreen: true,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
      });
      
      iframeContainer.appendChild(iframe);
      videoContainer.appendChild(iframeContainer);
      
      // Video Title (if available)
      if (this.data.title) {
        const title = this._make('div', ['youtube-embed-block__title']);
        title.textContent = this.data.title;
        videoContainer.appendChild(title);
      }
    }
    
    // Caption Input
    if (!this.readOnly) {
      const captionInput = this._make('input', ['youtube-embed-block__caption'], {
        type: 'text',
        placeholder: 'Add a caption for this video...',
        value: this.data.caption || ''
      });
      
      captionInput.addEventListener('input', (e) => {
        this.data.caption = (e.target as HTMLInputElement).value;
      });
      
      videoContainer.appendChild(captionInput);
    } else if (this.data.caption) {
      // Show caption in read-only mode
      const caption = this._make('div', ['youtube-embed-block__caption-display']);
      caption.textContent = this.data.caption;
      videoContainer.appendChild(caption);
    }
    
    wrapper.appendChild(videoContainer);
  }

  private _handleUrlChange(url: string): void {
    this.data.url = url;
    const videoId = this._extractVideoId(url);
    
    if (videoId !== this.data.videoId) {
      this.data.videoId = videoId;
      
      // Fetch video title if we have a valid video ID
      if (videoId) {
        this._fetchVideoTitle(videoId);
      } else {
        this.data.title = '';
      }
      
      this._updateEmbed();
    }
  }

  private _extractVideoId(url: string): string {
    if (!url) return '';
    
    // Handle different YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return '';
  }

  private _fetchVideoTitle(videoId: string): void {
    // In a real implementation, you might fetch the title from YouTube API
    // For now, we'll use a placeholder or extract from URL if available
    // This would require an API key and proper CORS setup
    
    // Simple fallback - you could enhance this with actual API calls
    this.data.title = `YouTube Video: ${videoId}`;
  }

  private _getEmbedUrl(): string {
    if (!this.data.videoId) return '';
    
    const baseUrl = this.data.privacyMode 
      ? 'https://www.youtube-nocookie.com/embed' 
      : 'https://www.youtube.com/embed';
    
    const params = new URLSearchParams();
    
    if (!this.data.controls) params.set('controls', '0');
    if (this.data.autoplay) params.set('autoplay', '1');
    if (this.data.startTime) params.set('start', this.data.startTime.toString());
    
    const paramString = params.toString();
    return `${baseUrl}/${this.data.videoId}${paramString ? '?' + paramString : ''}`;
  }

  private _updateEmbed(): void {
    if (!this.wrapper) return;
    
    const videoContainer = this.wrapper.querySelector('.youtube-embed-block__video');
    if (videoContainer) {
      // Remove existing video container and re-render
      videoContainer.remove();
      this._renderVideo(this.wrapper as HTMLElement);
    }
  }

  save(blockContent: HTMLElement): YouTubeEmbedData {
    const urlInput = blockContent.querySelector('.youtube-embed-block__url-input') as HTMLInputElement;
    const captionInput = blockContent.querySelector('.youtube-embed-block__caption') as HTMLInputElement;
    const startTimeInput = blockContent.querySelector('.youtube-embed-block__start-time-input') as HTMLInputElement;
    
    // Update caption
    if (captionInput) {
      this.data.caption = captionInput.value;
    }
    
    // Update start time
    if (startTimeInput) {
      const value = parseInt(startTimeInput.value);
      this.data.startTime = isNaN(value) ? undefined : value;
    }
    
    return {
      url: this.data.url,
      videoId: this.data.videoId,
      title: this.data.title,
      caption: this.data.caption,
      autoplay: this.data.autoplay,
      controls: this.data.controls,
      privacyMode: this.data.privacyMode,
      startTime: this.data.startTime
    };
  }

  validate(data: YouTubeEmbedData): boolean {
    return !!data.videoId;
  }

  private _make<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    classNames: string | string[] | null = null,
    attributes: { [key: string]: any } = {}
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames);
    } else if (classNames) {
      el.classList.add(classNames);
    }

    for (const attrName in attributes) {
      (el as any)[attrName] = attributes[attrName];
    }

    return el;
  }

  static get sanitize() {
    return {
      url: false,
      videoId: false,
      title: true, // Allow basic HTML in titles
      caption: true, // Allow basic HTML in captions
      autoplay: false,
      controls: false,
      privacyMode: false,
      startTime: false
    };
  }
}
