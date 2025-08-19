import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface SingleImageData extends BlockToolData {
  image?: {
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    alt?: string;
    mediaID?: number;
    fileName?: string;
  };
  showCaption: boolean;
}

export interface SingleImageConfig {
  allowCaption?: boolean;
  placeholder?: string;
}

interface SingleImageConstructorArgs {
  data: SingleImageData;
  config?: SingleImageConfig;
  api: API;
  readOnly: boolean;
}

export default class SingleImageBlock implements BlockTool {
  private api: API;
  private data: SingleImageData;
  private readOnly: boolean;
  private config: SingleImageConfig;

  static get toolbox(): ToolboxConfig {
    return {
      title: 'Single Image',
      icon: `<svg width="17" height="15" viewBox="0 0 17 15" fill="none">
        <rect x="2" y="2" width="13" height="11" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
        <path d="M12 9L9 6L5 10L12 10Z" fill="currentColor"/>
      </svg>`
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  constructor({ data, config, api, readOnly }: SingleImageConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    this.data = {
      image: data.image || undefined,
      showCaption: data.showCaption ?? (this.config.allowCaption ?? true)
    };
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['single-image-block']);
    
    // Controls section (only in edit mode)
    if (!this.readOnly) {
      const controls = this._make('div', ['single-image-block__controls']);
      
      const selectButton = this._make('button', ['single-image-block__select-btn'], {
        type: 'button'
      });
      selectButton.innerHTML = this.data.image ? '🖼️ Replace Image' : '🖼️ Select Image';
      
      // Caption toggle (if captions are allowed)
      if (this.config.allowCaption !== false) {
        const captionToggle = this._make('label', ['single-image-block__caption-toggle']);
        const captionCheckbox = this._make('input', null, {
          type: 'checkbox',
          checked: this.data.showCaption
        });
        const captionLabel = this._make('span');
        captionLabel.textContent = ' Show caption';
        captionToggle.appendChild(captionCheckbox);
        captionToggle.appendChild(captionLabel);
        controls.appendChild(captionToggle);
      }
      
      controls.appendChild(selectButton);
      wrapper.appendChild(controls);
    }
    
    // Image container
    const imageContainer = this._make('div', ['single-image-block__container']);
    this._renderImage(imageContainer);
    wrapper.appendChild(imageContainer);
    
    // Attach event listeners
    if (!this.readOnly) {
      this._attachEventListeners(wrapper);
    }
    
    return wrapper;
  }

  save(blockContent: HTMLElement): SingleImageData {
    const captionCheckbox = blockContent.querySelector('.single-image-block__caption-toggle input') as HTMLInputElement;
    const captionInput = blockContent.querySelector('.single-image-block__caption') as HTMLInputElement;
    
    // Update caption if it exists
    if (this.data.image && captionInput) {
      this.data.image.caption = captionInput.value;
    }
    
    return {
      image: this.data.image,
      showCaption: captionCheckbox?.checked ?? true
    };
  }

  validate(data: SingleImageData): boolean {
    return !!data.image;
  }

  private _attachEventListeners(wrapper: HTMLElement): void {
    const selectButton = wrapper.querySelector('.single-image-block__select-btn');
    const captionToggle = wrapper.querySelector('.single-image-block__caption-toggle input');
    
    // Image selection
    selectButton?.addEventListener('click', () => {
      this._openAssetSelector();
    });
    
    // Caption toggle
    captionToggle?.addEventListener('change', (e) => {
      this.data.showCaption = (e.target as HTMLInputElement).checked;
      this._updateImageDisplay(wrapper);
    });
  }

  private _openAssetSelector(): void {
    // Access selectAssets from window (available in Agility app context)
    if (typeof window !== 'undefined' && (window as any).selectAssets) {
      (window as any).selectAssets({
        title: "Select Image",
        singleSelectOnly: true,
        callback: (assets: any[]) => {
          this._handleSelectedAsset(assets[0]);
        }
      });
    } else {
      // Fallback for development/testing
      console.log('Asset selector not available. This block requires the Agility App SDK.');
      this._simulateAssetSelection();
    }
  }

  private _handleSelectedAsset(asset: any): void {
    if (!asset) return;
    
    this.data.image = {
      url: asset.EdgeUrl || asset.OriginUrl,
      thumbnailUrl: asset.ThumbnailUrl,
      alt: asset.FileName?.replace(/\.[^/.]+$/, "") || '',
      caption: '',
      mediaID: asset.MediaID,
      fileName: asset.FileName
    };
    
    // Re-render image
    const wrapper = document.querySelector('.single-image-block');
    if (wrapper) {
      const imageContainer = wrapper.querySelector('.single-image-block__container');
      if (imageContainer) {
        this._renderImage(imageContainer as HTMLElement);
        
        // Update button text
        const selectButton = wrapper.querySelector('.single-image-block__select-btn');
        if (selectButton) {
          selectButton.innerHTML = '🖼️ Replace Image';
        }
      }
    }
  }

  private _simulateAssetSelection(): void {
    // For development/testing when SDK not available
    const sampleImage = {
      url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
      thumbnailUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200',
      alt: 'Sample image',
      caption: '',
      mediaID: Math.random(),
      fileName: 'sample-image.jpg'
    };
    
    this._handleSelectedAsset(sampleImage);
  }

  private _renderImage(container: HTMLElement): void {
    container.innerHTML = '';
    
    if (!this.data.image) {
      const placeholder = this._make('div', ['single-image-block__placeholder']);
      placeholder.innerHTML = this.config.placeholder || 
        '🖼️ No image selected. Click "Select Image" to choose a photo from your media library.';
      container.appendChild(placeholder);
      return;
    }
    
    const imageWrapper = this._make('div', ['single-image-block__image-wrapper']);
    
    const img = this._make('img', ['single-image-block__img'], {
      src: this.data.image.url,
      alt: this.data.image.alt || 'Selected image',
      loading: 'lazy'
    });
    
    imageWrapper.appendChild(img);
    
    // Remove button (edit mode only)
    if (!this.readOnly) {
      const deleteBtn = this._make('button', ['single-image-block__remove'], {
        type: 'button',
        title: 'Remove image'
      });
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', () => {
        this._removeImage();
      });
      imageWrapper.appendChild(deleteBtn);
    }
    
    container.appendChild(imageWrapper);
    
    // Caption input
    if (this.data.showCaption && this.config.allowCaption !== false) {
      const captionInput = this._make('input', ['single-image-block__caption'], {
        type: 'text',
        placeholder: 'Add a caption...',
        value: this.data.image.caption || '',
        disabled: this.readOnly
      });
      container.appendChild(captionInput);
    }
  }

  private _removeImage(): void {
    this.data.image = undefined;
    
    // Re-render
    const wrapper = document.querySelector('.single-image-block');
    if (wrapper) {
      const imageContainer = wrapper.querySelector('.single-image-block__container');
      if (imageContainer) {
        this._renderImage(imageContainer as HTMLElement);
        
        // Update button text
        const selectButton = wrapper.querySelector('.single-image-block__select-btn');
        if (selectButton) {
          selectButton.innerHTML = '🖼️ Select Image';
        }
      }
    }
  }

  private _updateImageDisplay(wrapper: HTMLElement): void {
    const imageContainer = wrapper.querySelector('.single-image-block__container');
    if (imageContainer) {
      this._renderImage(imageContainer as HTMLElement);
    }
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
      image: false, // Image data should not contain HTML
      showCaption: false
    };
  }
}
