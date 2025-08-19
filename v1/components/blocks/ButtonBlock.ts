import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface ButtonData extends BlockToolData {
  text: string;
  url: string;
  variant: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost';
  size: 'small' | 'medium' | 'large';
  target: '_self' | '_blank';
  fullWidth: boolean;
}

export interface ButtonConfig {
  defaultVariant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost';
  defaultSize?: 'small' | 'medium' | 'large';
  allowedVariants?: ('primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost')[];
  allowedSizes?: ('small' | 'medium' | 'large')[];
  showAdvancedOptions?: boolean;
  placeholder?: string;
}

interface ButtonConstructorArgs {
  data: ButtonData;
  config?: ButtonConfig;
  api: API;
  readOnly: boolean;
}

export default class ButtonBlock implements BlockTool {
  private api: API;
  private data: ButtonData;
  private readOnly: boolean;
  private config: ButtonConfig;
  private wrapper: HTMLElement | null = null;

  static get toolbox(): ToolboxConfig {
    return {
      title: 'Button',
      icon: `<svg width="17" height="15" viewBox="0 0 17 15" fill="none">
        <rect x="2" y="4" width="13" height="7" rx="3.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <circle cx="8.5" cy="7.5" r="1" fill="currentColor"/>
      </svg>`
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  constructor({ data, config, api, readOnly }: ButtonConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    this.data = {
      text: data.text || '',
      url: data.url || '',
      variant: data.variant || this.config.defaultVariant || 'primary',
      size: data.size || this.config.defaultSize || 'medium',
      target: data.target || '_self',
      fullWidth: data.fullWidth ?? false
    };
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['button-block']);
    this.wrapper = wrapper;
    
    if (!this.readOnly) {
      this._renderControls(wrapper);
    }
    
    this._renderButton(wrapper);
    
    return wrapper;
  }

  private _renderControls(wrapper: HTMLElement): void {
    const controls = this._make('div', ['button-block__controls']);
    
    // Text Input
    const textInput = this._make('input', ['button-block__text-input'], {
      type: 'text',
      placeholder: this.config.placeholder || 'Button text...',
      value: this.data.text
    });
    
    textInput.addEventListener('input', (e) => {
      this.data.text = (e.target as HTMLInputElement).value;
      this._updateButton();
    });
    
    // URL Input
    const urlInput = this._make('input', ['button-block__url-input'], {
      type: 'url',
      placeholder: 'https://example.com',
      value: this.data.url
    });
    
    urlInput.addEventListener('input', (e) => {
      this.data.url = (e.target as HTMLInputElement).value;
      this._updateButton();
    });
    
    const inputsContainer = this._make('div', ['button-block__inputs']);
    inputsContainer.appendChild(textInput);
    inputsContainer.appendChild(urlInput);
    controls.appendChild(inputsContainer);
    
    // Style Options
    if (this.config.showAdvancedOptions !== false) {
      const optionsContainer = this._make('div', ['button-block__options']);
      
      // Variant Selector
      const variantSelector = this._make('select', ['button-block__variant'], {
        disabled: this.readOnly
      });
      
      const allowedVariants = this.config.allowedVariants || ['primary', 'secondary', 'tertiary', 'outline', 'ghost'];
      const variantLabels = {
        primary: 'Primary',
        secondary: 'Secondary', 
        tertiary: 'Tertiary',
        outline: 'Outline',
        ghost: 'Ghost'
      };
      
      allowedVariants.forEach(variant => {
        const option = this._make('option', null, { value: variant });
        option.textContent = variantLabels[variant];
        option.selected = variant === this.data.variant;
        variantSelector.appendChild(option);
      });
      
      variantSelector.addEventListener('change', (e) => {
        this.data.variant = (e.target as HTMLSelectElement).value as any;
        this._updateButton();
      });
      
      // Size Selector
      const sizeSelector = this._make('select', ['button-block__size'], {
        disabled: this.readOnly
      });
      
      const allowedSizes = this.config.allowedSizes || ['small', 'medium', 'large'];
      const sizeLabels = {
        small: 'Small',
        medium: 'Medium',
        large: 'Large'
      };
      
      allowedSizes.forEach(size => {
        const option = this._make('option', null, { value: size });
        option.textContent = sizeLabels[size];
        option.selected = size === this.data.size;
        sizeSelector.appendChild(option);
      });
      
      sizeSelector.addEventListener('change', (e) => {
        this.data.size = (e.target as HTMLSelectElement).value as any;
        this._updateButton();
      });
      
      // Target Toggle
      const targetToggle = this._make('label', ['button-block__target-toggle']);
      const targetCheckbox = this._make('input', null, {
        type: 'checkbox',
        checked: this.data.target === '_blank'
      });
      const targetLabel = this._make('span');
      targetLabel.textContent = ' Open in new tab';
      
      targetCheckbox.addEventListener('change', (e) => {
        this.data.target = (e.target as HTMLInputElement).checked ? '_blank' : '_self';
      });
      
      targetToggle.appendChild(targetCheckbox);
      targetToggle.appendChild(targetLabel);
      
      // Full Width Toggle
      const fullWidthToggle = this._make('label', ['button-block__fullwidth-toggle']);
      const fullWidthCheckbox = this._make('input', null, {
        type: 'checkbox',
        checked: this.data.fullWidth
      });
      const fullWidthLabel = this._make('span');
      fullWidthLabel.textContent = ' Full width';
      
      fullWidthCheckbox.addEventListener('change', (e) => {
        this.data.fullWidth = (e.target as HTMLInputElement).checked;
        this._updateButton();
      });
      
      fullWidthToggle.appendChild(fullWidthCheckbox);
      fullWidthToggle.appendChild(fullWidthLabel);
      
      // Add elements to options container
      const selectorsContainer = this._make('div', ['button-block__selectors']);
      selectorsContainer.appendChild(variantSelector);
      selectorsContainer.appendChild(sizeSelector);
      
      const togglesContainer = this._make('div', ['button-block__toggles']);
      togglesContainer.appendChild(targetToggle);
      togglesContainer.appendChild(fullWidthToggle);
      
      optionsContainer.appendChild(selectorsContainer);
      optionsContainer.appendChild(togglesContainer);
      controls.appendChild(optionsContainer);
    }
    
    wrapper.appendChild(controls);
  }

  private _renderButton(wrapper: HTMLElement): void {
    const buttonContainer = this._make('div', ['button-block__preview']);
    
    if (!this.data.text) {
      const placeholder = this._make('div', ['button-block__placeholder']);
      placeholder.innerHTML = '🔘 Enter button text above to see preview';
      buttonContainer.appendChild(placeholder);
    } else {
      // Create button preview
      const button = this._make('button', [
        'button-block__button',
        `button-block__button--${this.data.variant}`,
        `button-block__button--${this.data.size}`,
        this.data.fullWidth ? 'button-block__button--full-width' : ''
      ], {
        type: 'button',
        disabled: this.readOnly
      });
      
      button.textContent = this.data.text;
      
      // Add click preview for edit mode
      if (!this.readOnly && this.data.url) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          const message = this._make('div', ['button-block__click-message']);
          message.textContent = `Would link to: ${this.data.url}`;
          button.parentElement?.appendChild(message);
          setTimeout(() => message.remove(), 2000);
        });
      }
      
      buttonContainer.appendChild(button);
      
      // Show URL info
      if (this.data.url) {
        const urlInfo = this._make('div', ['button-block__url-info']);
        urlInfo.innerHTML = `
          <span class="button-block__url-label">Links to:</span>
          <span class="button-block__url-value">${this.data.url}</span>
          ${this.data.target === '_blank' ? '<span class="button-block__target-badge">New Tab</span>' : ''}
        `;
        buttonContainer.appendChild(urlInfo);
      }
    }
    
    wrapper.appendChild(buttonContainer);
  }

  private _updateButton(): void {
    if (!this.wrapper) return;
    
    const buttonContainer = this.wrapper.querySelector('.button-block__preview');
    if (buttonContainer) {
      buttonContainer.remove();
      this._renderButton(this.wrapper as HTMLElement);
    }
  }

  save(blockContent: HTMLElement): ButtonData {
    const textInput = blockContent.querySelector('.button-block__text-input') as HTMLInputElement;
    const urlInput = blockContent.querySelector('.button-block__url-input') as HTMLInputElement;
    const variantSelector = blockContent.querySelector('.button-block__variant') as HTMLSelectElement;
    const sizeSelector = blockContent.querySelector('.button-block__size') as HTMLSelectElement;
    const targetCheckbox = blockContent.querySelector('.button-block__target-toggle input') as HTMLInputElement;
    const fullWidthCheckbox = blockContent.querySelector('.button-block__fullwidth-toggle input') as HTMLInputElement;
    
    return {
      text: textInput?.value || '',
      url: urlInput?.value || '',
      variant: variantSelector?.value as any || 'primary',
      size: sizeSelector?.value as any || 'medium',
      target: targetCheckbox?.checked ? '_blank' : '_self',
      fullWidth: fullWidthCheckbox?.checked ?? false
    };
  }

  validate(data: ButtonData): boolean {
    return data.text.trim() !== '';
  }

  private _make<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    classNames: string | string[] | null = null,
    attributes: { [key: string]: any } = {}
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
      el.classList.add(...classNames.filter(Boolean));
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
      text: true, // Allow basic HTML in button text
      url: false,
      variant: false,
      size: false,
      target: false,
      fullWidth: false
    };
  }
}
