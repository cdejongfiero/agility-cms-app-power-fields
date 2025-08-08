import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface AgilityImageData extends BlockToolData {
  images: {
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    alt?: string;
    mediaID?: number;
    fileName?: string;
  }[];
  galleryType: 'single' | 'gallery' | 'hero';
  showCaptions: boolean;
}

export interface AgilityImageConfig {
  maxImages?: number;
  allowCaptions?: boolean;
  defaultGalleryType?: 'single' | 'gallery' | 'hero';
}

interface AgilityImageConstructorArgs {
  data: AgilityImageData;
  config?: AgilityImageConfig;
  api: API;
  readOnly: boolean;
}

export default class AgilityImageBlock implements BlockTool {
  private api: API;
  private data: AgilityImageData;
  private readOnly: boolean;
  private config: AgilityImageConfig;

  static get toolbox(): ToolboxConfig {
    return {
      title: 'Image Gallery',
      icon: `<svg width="17" height="15" viewBox="0 0 17 15" fill="none">
        <rect x="1" y="1" width="7" height="6" rx="1" stroke="currentColor" stroke-width="1"/>
        <rect x="9" y="1" width="7" height="6" rx="1" stroke="currentColor" stroke-width="1"/>
        <rect x="1" y="8" width="7" height="6" rx="1" stroke="currentColor" stroke-width="1"/>
        <rect x="9" y="8" width="7" height="6" rx="1" stroke="currentColor" stroke-width="1"/>
        <circle cx="3" cy="3" r="0.5" fill="currentColor"/>
        <circle cx="11" cy="3" r="0.5" fill="currentColor"/>
        <circle cx="3" cy="10" r="0.5" fill="currentColor"/>
        <circle cx="11" cy="10" r="0.5" fill="currentColor"/>
      </svg>`
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  constructor({ data, config, api, readOnly }: AgilityImageConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    this.data = {
      images: data.images || [],
      galleryType: (data.galleryType as 'single' | 'gallery' | 'hero') || 
                   (this.config.defaultGalleryType as 'single' | 'gallery' | 'hero') || 
                   'gallery',
      showCaptions: data.showCaptions ?? (this.config.allowCaptions ?? true)
    };
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['agility-image-block']);
    
    // Controls section
    if (!this.readOnly) {
      const controls = this._make('div', ['agility-image-block__controls']);
      
      const selectButton = this._make('button', ['agility-image-block__select-btn'], {
        type: 'button'
      });
      selectButton.innerHTML = this.data.images.length > 0 ? '🖼️ Add More Images' : '🖼️ Select Images';
      
      const galleryTypeSelector = this._make('select', ['agility-image-block__gallery-type'], {
        disabled: this.readOnly
      });
      
      const galleryTypes = [
        { value: 'single', label: 'Single Image' },
        { value: 'gallery', label: 'Image Gallery' },
        { value: 'hero', label: 'Hero Image' }
      ];
      
      galleryTypes.forEach(type => {
        const option = this._make('option', null, { value: type.value });
        option.textContent = type.label;
        option.selected = type.value === this.data.galleryType;
        galleryTypeSelector.appendChild(option);
      });
      
      if (this.config.allowCaptions !== false) {
        const captionToggle = this._make('label', ['agility-image-block__caption-toggle']);
        const captionCheckbox = this._make('input', null, {
          type: 'checkbox',
          checked: this.data.showCaptions
        });
        const captionLabel = this._make('span');
        captionLabel.textContent = ' Show captions';
        captionToggle.appendChild(captionCheckbox);
        captionToggle.appendChild(captionLabel);
        controls.appendChild(captionToggle);
      }
      
      controls.appendChild(selectButton);
      controls.appendChild(galleryTypeSelector);
      wrapper.appendChild(controls);
    }
    
    // Images container
    const imagesContainer = this._make('div', ['agility-image-block__images']);
    this._renderImages(imagesContainer);
    wrapper.appendChild(imagesContainer);
    
    // Attach event listeners
    if (!this.readOnly) {
      this._attachEventListeners(wrapper);
    }
    
    return wrapper;
  }

  save(blockContent: HTMLElement): AgilityImageData {
    const galleryTypeSelector = blockContent.querySelector('.agility-image-block__gallery-type') as HTMLSelectElement;
    const captionCheckbox = blockContent.querySelector('.agility-image-block__caption-toggle input') as HTMLInputElement;
    
    // Extract captions from current DOM
    const captionInputs = blockContent.querySelectorAll('.agility-image-block__caption');
    this.data.images.forEach((image, index) => {
      const captionInput = captionInputs[index] as HTMLInputElement;
      if (captionInput) {
        image.caption = captionInput.value;
      }
    });
    
    return {
      images: this.data.images,
      galleryType: galleryTypeSelector?.value as any || 'gallery',
      showCaptions: captionCheckbox?.checked ?? true
    };
  }

  validate(data: AgilityImageData): boolean {
    return data.images.length > 0;
  }

  private _attachEventListeners(wrapper: HTMLElement): void {
    const selectButton = wrapper.querySelector('.agility-image-block__select-btn');
    const galleryTypeSelector = wrapper.querySelector('.agility-image-block__gallery-type');
    const captionToggle = wrapper.querySelector('.agility-image-block__caption-toggle input');
    
    // Image selection using Agility SDK
    selectButton?.addEventListener('click', () => {
      this._openAssetSelector();
    });
    
    // Gallery type change
    galleryTypeSelector?.addEventListener('change', (e) => {
      this.data.galleryType = (e.target as HTMLSelectElement).value as any;
      this._updateGalleryDisplay(wrapper);
    });
    
    // Caption toggle
    captionToggle?.addEventListener('change', (e) => {
      this.data.showCaptions = (e.target as HTMLInputElement).checked;
      this._updateGalleryDisplay(wrapper);
    });
  }

  private _openAssetSelector(): void {
    // Access selectAssets from window since we're in Editor.js context
    // This will be available when the block is used within the Agility app
    if (typeof window !== 'undefined' && (window as any).selectAssets) {
      (window as any).selectAssets({
        title: "Select Images for Gallery",
        singleSelectOnly: this.data.galleryType === 'single',
        callback: (assets: any[]) => {
          this._handleSelectedAssets(assets);
        }
      });
    } else {
      // Fallback for development/testing
      console.log('Asset selector not available. This block requires the Agility App SDK.');
      this._simulateAssetSelection();
    }
  }

  private _handleSelectedAssets(assets: any[]): void {
    const newImages = assets.map(asset => ({
      url: asset.EdgeUrl || asset.OriginUrl,
      thumbnailUrl: asset.ThumbnailUrl,
      alt: asset.FileName?.replace(/\.[^/.]+$/, "") || '',
      caption: '',
      mediaID: asset.MediaID,
      fileName: asset.FileName
    }));
    
    if (this.data.galleryType === 'single') {
      // Replace existing images
      this.data.images = newImages.slice(0, 1);
    } else {
      // Add to existing images
      const maxImages = this.config.maxImages || 10;
      this.data.images = [...this.data.images, ...newImages].slice(0, maxImages);
    }
    
    // Re-render images
    const wrapper = document.querySelector('.agility-image-block');
    if (wrapper) {
      const imagesContainer = wrapper.querySelector('.agility-image-block__images');
      if (imagesContainer) {
        this._renderImages(imagesContainer as HTMLElement);
        this._updateGalleryDisplay(wrapper as HTMLElement);
      }
    }
  }

  private _simulateAssetSelection(): void {
    // For development/testing when SDK not available
    const sampleImages = [
      {
        url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
        thumbnailUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200',
        alt: 'Sample food image',
        caption: '',
        mediaID: Math.random(),
        fileName: 'sample-food.jpg'
      },
      {
        url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200',
        alt: 'Sample cooking image',
        caption: '',
        mediaID: Math.random(),
        fileName: 'sample-cooking.jpg'
      }
    ];
    
    this._handleSelectedAssets(this.data.galleryType === 'single' ? [sampleImages[0]] : sampleImages);
  }

  private _renderImages(container: HTMLElement): void {
    container.innerHTML = '';
    
    if (this.data.images.length === 0) {
      const placeholder = this._make('div', ['agility-image-block__placeholder']);
      placeholder.innerHTML = '🖼️ No images selected. Click "Select Images" to add photos from your Agility media library.';
      container.appendChild(placeholder);
      return;
    }
    
    this.data.images.forEach((image, index) => {
      const imageItem = this._make('div', ['agility-image-block__item']);
      
      const img = this._make('img', ['agility-image-block__img'], {
        src: image.thumbnailUrl || image.url,
        alt: image.alt || `Image ${index + 1}`,
        loading: 'lazy'
      });
      
      imageItem.appendChild(img);
      
      if (!this.readOnly) {
        const deleteBtn = this._make('button', ['agility-image-block__delete'], {
          type: 'button',
          title: 'Remove image'
        });
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', () => {
          this._removeImage(index);
        });
        imageItem.appendChild(deleteBtn);
      }
      
      if (this.data.showCaptions && this.config.allowCaptions !== false) {
        const captionInput = this._make('input', ['agility-image-block__caption'], {
          type: 'text',
          placeholder: 'Add a caption...',
          value: image.caption || '',
          disabled: this.readOnly
        });
        imageItem.appendChild(captionInput);
      }
      
      container.appendChild(imageItem);
    });
  }

  private _removeImage(index: number): void {
    this.data.images.splice(index, 1);
    
    // Re-render
    const wrapper = document.querySelector('.agility-image-block');
    if (wrapper) {
      const imagesContainer = wrapper.querySelector('.agility-image-block__images');
      if (imagesContainer) {
        this._renderImages(imagesContainer as HTMLElement);
      }
    }
  }

  private _updateGalleryDisplay(wrapper: HTMLElement): void {
    const imagesContainer = wrapper.querySelector('.agility-image-block__images');
    if (!imagesContainer) return;
    
    // Update CSS classes based on gallery type
    imagesContainer.className = `agility-image-block__images agility-image-block__images--${this.data.galleryType}`;
    
    // Re-render to show/hide captions
    this._renderImages(imagesContainer as HTMLElement);
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
      images: false, // Image data should not contain HTML
      galleryType: false,
      showCaptions: false
    };
  }
}
