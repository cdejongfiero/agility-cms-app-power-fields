import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface ImageGalleryData extends BlockToolData {
  images: {
    url: string;
    thumbnailUrl?: string;
    caption?: string;
    alt?: string;
    mediaID?: number;
    fileName?: string;
  }[];
  showCaptions: boolean;
  layout: 'grid' | 'masonry' | 'carousel' | 'slideshow';
  currentSlide?: number; // For carousel/slideshow navigation
}

export interface ImageGalleryConfig {
  maxImages?: number;
  allowCaptions?: boolean;
  defaultLayout?: 'grid' | 'masonry' | 'carousel' | 'slideshow';
  placeholder?: string;
}

interface ImageGalleryConstructorArgs {
  data: ImageGalleryData;
  config?: ImageGalleryConfig;
  api: API;
  readOnly: boolean;
}

export default class ImageGalleryBlock implements BlockTool {
  private api: API;
  private data: ImageGalleryData;
  private readOnly: boolean;
  private config: ImageGalleryConfig;

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

  constructor({ data, config, api, readOnly }: ImageGalleryConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    this.data = {
      images: data.images || [],
      showCaptions: data.showCaptions ?? (this.config.allowCaptions ?? true),
      layout: data.layout || this.config.defaultLayout || 'grid',
      currentSlide: data.currentSlide || 0
    };
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['image-gallery-block']);
    
    // Controls section (only in edit mode)
    if (!this.readOnly) {
      const controls = this._make('div', ['image-gallery-block__controls']);
      
      const selectButton = this._make('button', ['image-gallery-block__select-btn'], {
        type: 'button'
      });
      selectButton.innerHTML = this.data.images.length > 0 ? '🖼️ Add More Images' : '🖼️ Select Images';
      
      // Layout selector
      const layoutSelector = this._make('select', ['image-gallery-block__layout'], {
        disabled: this.readOnly
      });
      
      const layouts = [
        { value: 'grid', label: 'Grid Layout' },
        { value: 'masonry', label: 'Masonry Layout' },
        { value: 'carousel', label: 'Carousel Layout' },
        { value: 'slideshow', label: 'Slideshow Layout' }
      ];
      
      layouts.forEach(layout => {
        const option = this._make('option', null, { value: layout.value });
        option.textContent = layout.label;
        option.selected = layout.value === this.data.layout;
        layoutSelector.appendChild(option);
      });
      
      // Caption toggle (if captions are allowed)
      if (this.config.allowCaptions !== false) {
        const captionToggle = this._make('label', ['image-gallery-block__caption-toggle']);
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
      controls.appendChild(layoutSelector);
      wrapper.appendChild(controls);
    }
    
    // Images container
    const imagesContainer = this._make('div', ['image-gallery-block__images']);
    this._renderImages(imagesContainer);
    wrapper.appendChild(imagesContainer);
    
    // Attach event listeners
    if (!this.readOnly) {
      this._attachEventListeners(wrapper);
    }
    
    return wrapper;
  }

  save(blockContent: HTMLElement): ImageGalleryData {
    const layoutSelector = blockContent.querySelector('.image-gallery-block__layout') as HTMLSelectElement;
    const captionCheckbox = blockContent.querySelector('.image-gallery-block__caption-toggle input') as HTMLInputElement;
    
    // Extract captions from current DOM
    if (this.data.layout === 'carousel' || this.data.layout === 'slideshow') {
      // For navigable galleries, only update caption for current slide
      const currentCaptionInput = blockContent.querySelector('.image-gallery-block__caption') as HTMLInputElement;
      if (currentCaptionInput && this.data.images[this.data.currentSlide]) {
        this.data.images[this.data.currentSlide].caption = currentCaptionInput.value;
      }
    } else {
      // For static galleries, update all visible captions
      const captionInputs = blockContent.querySelectorAll('.image-gallery-block__caption');
      this.data.images.forEach((image, index) => {
        const captionInput = captionInputs[index] as HTMLInputElement;
        if (captionInput) {
          image.caption = captionInput.value;
        }
      });
    }
    
    return {
      images: this.data.images,
      showCaptions: captionCheckbox?.checked ?? true,
      layout: layoutSelector?.value as any || 'grid',
      currentSlide: this.data.currentSlide || 0
    };
  }

  validate(data: ImageGalleryData): boolean {
    return data.images.length > 0;
  }

  private _attachEventListeners(wrapper: HTMLElement): void {
    const selectButton = wrapper.querySelector('.image-gallery-block__select-btn');
    const layoutSelector = wrapper.querySelector('.image-gallery-block__layout');
    const captionToggle = wrapper.querySelector('.image-gallery-block__caption-toggle input');
    
    // Image selection
    selectButton?.addEventListener('click', () => {
      this._openAssetSelector();
    });
    
    // Layout change
    layoutSelector?.addEventListener('change', (e) => {
      this.data.layout = (e.target as HTMLSelectElement).value as any;
      this._updateGalleryDisplay(wrapper);
    });
    
    // Caption toggle
    captionToggle?.addEventListener('change', (e) => {
      this.data.showCaptions = (e.target as HTMLInputElement).checked;
      this._updateGalleryDisplay(wrapper);
    });
  }

  private _openAssetSelector(): void {
    // Access selectAssets from window (available in Agility app context)
    if (typeof window !== 'undefined' && (window as any).selectAssets) {
      (window as any).selectAssets({
        title: "Select Images for Gallery",
        singleSelectOnly: false,
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
    
    // Add to existing images
    const maxImages = this.config.maxImages || 20;
    this.data.images = [...this.data.images, ...newImages].slice(0, maxImages);
    
    // Re-render images
    const wrapper = document.querySelector('.image-gallery-block');
    if (wrapper) {
      const imagesContainer = wrapper.querySelector('.image-gallery-block__images');
      if (imagesContainer) {
        this._renderImages(imagesContainer as HTMLElement);
        this._updateGalleryDisplay(wrapper as HTMLElement);
        
        // Update button text
        const selectButton = wrapper.querySelector('.image-gallery-block__select-btn');
        if (selectButton) {
          selectButton.innerHTML = '🖼️ Add More Images';
        }
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
    
    this._handleSelectedAssets(sampleImages);
  }

  private _renderImages(container: HTMLElement): void {
    container.innerHTML = '';
    
    if (this.data.images.length === 0) {
      const placeholder = this._make('div', ['image-gallery-block__placeholder']);
      placeholder.innerHTML = this.config.placeholder || 
        '🖼️ No images selected. Click "Select Images" to add photos from your media library.';
      container.appendChild(placeholder);
      return;
    }
    
    // Update container classes for layout
    container.className = `image-gallery-block__images image-gallery-block__images--${this.data.layout}`;
    
    // Ensure currentSlide is within bounds
    this.data.currentSlide = Math.max(0, Math.min(this.data.currentSlide || 0, this.data.images.length - 1));
    
    // For carousel and slideshow layouts, add navigation
    if (this.data.layout === 'carousel' || this.data.layout === 'slideshow') {
      this._renderNavigableGallery(container);
    } else {
      this._renderStaticGallery(container);
    }
  }

  private _renderStaticGallery(container: HTMLElement): void {
    // Render grid/masonry layouts (all images visible)
    this.data.images.forEach((image, index) => {
      const imageItem = this._make('div', ['image-gallery-block__item']);
      
      const imageWrapper = this._make('div', ['image-gallery-block__image-wrapper']);
      
      const img = this._make('img', ['image-gallery-block__img'], {
        src: image.thumbnailUrl || image.url,
        alt: image.alt || `Gallery image ${index + 1}`,
        loading: 'lazy'
      });
      
      imageWrapper.appendChild(img);
      
      // Remove button (edit mode only)
      if (!this.readOnly) {
        const deleteBtn = this._make('button', ['image-gallery-block__remove'], {
          type: 'button',
          title: 'Remove image'
        });
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', () => {
          this._removeImage(index);
        });
        imageWrapper.appendChild(deleteBtn);
      }
      
      imageItem.appendChild(imageWrapper);
      
      // Caption input
      if (this.data.showCaptions && this.config.allowCaptions !== false) {
        const captionInput = this._make('input', ['image-gallery-block__caption'], {
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

  private _renderNavigableGallery(container: HTMLElement): void {
    // Create carousel/slideshow container
    const galleryWrapper = this._make('div', ['image-gallery-block__gallery-wrapper']);
    
    // Create slides container
    const slidesContainer = this._make('div', ['image-gallery-block__slides']);
    
    // Render all images as slides
    this.data.images.forEach((image, index) => {
      const slide = this._make('div', [
        'image-gallery-block__slide',
        index === this.data.currentSlide ? 'image-gallery-block__slide--active' : ''
      ]);
      
      const imageWrapper = this._make('div', ['image-gallery-block__image-wrapper']);
      
      const img = this._make('img', ['image-gallery-block__img'], {
        src: image.url, // Use full size for carousel/slideshow
        alt: image.alt || `Slide ${index + 1}`,
        loading: 'lazy'
      });
      
      imageWrapper.appendChild(img);
      
      // Remove button (edit mode only)
      if (!this.readOnly) {
        const deleteBtn = this._make('button', ['image-gallery-block__remove'], {
          type: 'button',
          title: 'Remove image'
        });
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', () => {
          this._removeImage(index);
        });
        imageWrapper.appendChild(deleteBtn);
      }
      
      slide.appendChild(imageWrapper);
      
      // Caption for current slide
      if (this.data.showCaptions && this.config.allowCaptions !== false && index === this.data.currentSlide) {
        const captionInput = this._make('input', ['image-gallery-block__caption'], {
          type: 'text',
          placeholder: 'Add a caption...',
          value: image.caption || '',
          disabled: this.readOnly
        });
        slide.appendChild(captionInput);
      }
      
      slidesContainer.appendChild(slide);
    });
    
    galleryWrapper.appendChild(slidesContainer);
    
    // Add navigation controls (only show if more than 1 image)
    if (this.data.images.length > 1) {
      // Previous button
      const prevBtn = this._make('button', ['image-gallery-block__nav', 'image-gallery-block__nav--prev'], {
        type: 'button',
        title: 'Previous image'
      });
      prevBtn.innerHTML = '‹';
      prevBtn.addEventListener('click', () => this._previousSlide());
      
      // Next button
      const nextBtn = this._make('button', ['image-gallery-block__nav', 'image-gallery-block__nav--next'], {
        type: 'button',
        title: 'Next image'
      });
      nextBtn.innerHTML = '›';
      nextBtn.addEventListener('click', () => this._nextSlide());
      
      galleryWrapper.appendChild(prevBtn);
      galleryWrapper.appendChild(nextBtn);
      
      // Dot indicators (especially useful for slideshow)
      const indicators = this._make('div', ['image-gallery-block__indicators']);
      this.data.images.forEach((_, index) => {
        const dot = this._make('button', [
          'image-gallery-block__indicator',
          index === this.data.currentSlide ? 'image-gallery-block__indicator--active' : ''
        ], {
          type: 'button',
          title: `Go to slide ${index + 1}`
        });
        dot.addEventListener('click', () => this._goToSlide(index));
        indicators.appendChild(dot);
      });
      galleryWrapper.appendChild(indicators);
      
      // Slide counter
      const counter = this._make('div', ['image-gallery-block__counter']);
      counter.textContent = `${this.data.currentSlide + 1} / ${this.data.images.length}`;
      galleryWrapper.appendChild(counter);
    }
    
    container.appendChild(galleryWrapper);
  }

  private _previousSlide(): void {
    if (this.data.images.length <= 1) return;
    
    this.data.currentSlide = this.data.currentSlide > 0 
      ? this.data.currentSlide - 1 
      : this.data.images.length - 1;
    
    this._updateNavigableDisplay();
  }

  private _nextSlide(): void {
    if (this.data.images.length <= 1) return;
    
    this.data.currentSlide = this.data.currentSlide < this.data.images.length - 1 
      ? this.data.currentSlide + 1 
      : 0;
    
    this._updateNavigableDisplay();
  }

  private _goToSlide(index: number): void {
    if (index < 0 || index >= this.data.images.length) return;
    
    this.data.currentSlide = index;
    this._updateNavigableDisplay();
  }

  private _updateNavigableDisplay(): void {
    const wrapper = document.querySelector('.image-gallery-block');
    if (!wrapper) return;
    
    const imagesContainer = wrapper.querySelector('.image-gallery-block__images');
    if (!imagesContainer) return;
    
    // Update active slide
    const slides = imagesContainer.querySelectorAll('.image-gallery-block__slide');
    slides.forEach((slide, index) => {
      slide.classList.toggle('image-gallery-block__slide--active', index === this.data.currentSlide);
    });
    
    // Update indicators
    const indicators = imagesContainer.querySelectorAll('.image-gallery-block__indicator');
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('image-gallery-block__indicator--active', index === this.data.currentSlide);
    });
    
    // Update counter
    const counter = imagesContainer.querySelector('.image-gallery-block__counter');
    if (counter) {
      counter.textContent = `${this.data.currentSlide + 1} / ${this.data.images.length}`;
    }
    
    // Update caption for current slide
    const captionInputs = imagesContainer.querySelectorAll('.image-gallery-block__caption');
    captionInputs.forEach(input => input.remove()); // Remove old captions
    
    if (this.data.showCaptions && this.config.allowCaptions !== false) {
      const activeSlide = imagesContainer.querySelector('.image-gallery-block__slide--active');
      if (activeSlide) {
        const captionInput = this._make('input', ['image-gallery-block__caption'], {
          type: 'text',
          placeholder: 'Add a caption...',
          value: this.data.images[this.data.currentSlide]?.caption || '',
          disabled: this.readOnly
        });
        activeSlide.appendChild(captionInput);
      }
    }
  }

  private _removeImage(index: number): void {
    this.data.images.splice(index, 1);
    
    // Adjust currentSlide if necessary
    if (this.data.currentSlide >= this.data.images.length) {
      this.data.currentSlide = Math.max(0, this.data.images.length - 1);
    }
    
    // Re-render
    const wrapper = document.querySelector('.image-gallery-block');
    if (wrapper) {
      const imagesContainer = wrapper.querySelector('.image-gallery-block__images');
      if (imagesContainer) {
        this._renderImages(imagesContainer as HTMLElement);
        
        // Update button text if no images left
        if (this.data.images.length === 0) {
          const selectButton = wrapper.querySelector('.image-gallery-block__select-btn');
          if (selectButton) {
            selectButton.innerHTML = '🖼️ Select Images';
          }
        }
      }
    }
  }

  private _updateGalleryDisplay(wrapper: HTMLElement): void {
    const imagesContainer = wrapper.querySelector('.image-gallery-block__images');
    if (!imagesContainer) return;
    
    // Re-render to update layout and captions
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
      showCaptions: false,
      layout: false
    };
  }
}
