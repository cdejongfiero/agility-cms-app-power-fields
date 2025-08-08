import type { API, BlockTool, BlockToolData, ToolboxConfig } from '@editorjs/editorjs';

export interface RecipeInstruction {
  id: string;
  instruction: string;
  time?: string;
  temperature?: string;
}

export interface RecipeInstructionData extends BlockToolData {
  title: string;
  instructions: RecipeInstruction[];
  prepTime?: string;
  cookTime?: string;
}

export interface RecipeInstructionConfig {
  titlePlaceholder?: string;
  instructionPlaceholder?: string;
  maxInstructions?: number;
  showTiming?: boolean;
}

interface RecipeInstructionConstructorArgs {
  data: RecipeInstructionData;
  config?: RecipeInstructionConfig;
  api: API;
  readOnly: boolean;
}

export default class RecipeInstructionBlock implements BlockTool {
  private api: API;
  private data: RecipeInstructionData;
  private readOnly: boolean;
  private config: RecipeInstructionConfig;

  static get toolbox(): ToolboxConfig {
    return {
      title: 'Recipe Instructions',
      icon: `<svg width="17" height="15" viewBox="0 0 17 15" fill="none">
        <path d="M1 3h15M1 7h12M1 11h10" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="14" cy="11" r="2" stroke="currentColor" stroke-width="1"/>
      </svg>`
    };
  }

  static get isReadOnlySupported(): boolean {
    return true;
  }

  static get enableLineBreaks(): boolean {
    return true;
  }

  constructor({ data, config, api, readOnly }: RecipeInstructionConstructorArgs) {
    this.api = api;
    this.readOnly = readOnly;
    this.config = config || {};
    
    // Initialize data with defaults
    this.data = {
      title: data.title || 'Instructions',
      prepTime: data.prepTime || '',
      cookTime: data.cookTime || '',
      instructions: data.instructions && data.instructions.length > 0 ? data.instructions : [
        { id: this._generateId(), instruction: '', time: '', temperature: '' }
      ]
    };
  }

  render(): HTMLElement {
    const wrapper = this._make('div', ['recipe-instruction-block']);
    
    // Create header
    const header = this._make('div', ['recipe-instruction-block__header']);
    
    const title = this._make('div', ['recipe-instruction-block__title'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: this.data.title
    });
    title.dataset.placeholder = this.config.titlePlaceholder || 'Instructions';
    
    // Timing information
    const timingContainer = this._make('div', ['recipe-instruction-block__timing']);
    
    const prepTimeContainer = this._make('div', ['recipe-instruction-block__time-item']);
    const prepLabel = this._make('span', ['recipe-instruction-block__time-label']);
    prepLabel.textContent = 'Prep:';
    const prepTime = this._make('div', ['recipe-instruction-block__prep-time'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: this.data.prepTime || ''
    });
    prepTime.dataset.placeholder = '15 min';
    prepTimeContainer.appendChild(prepLabel);
    prepTimeContainer.appendChild(prepTime);
    
    const cookTimeContainer = this._make('div', ['recipe-instruction-block__time-item']);
    const cookLabel = this._make('span', ['recipe-instruction-block__time-label']);
    cookLabel.textContent = 'Cook:';
    const cookTime = this._make('div', ['recipe-instruction-block__cook-time'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: this.data.cookTime || ''
    });
    cookTime.dataset.placeholder = '30 min';
    cookTimeContainer.appendChild(cookLabel);
    cookTimeContainer.appendChild(cookTime);
    
    timingContainer.appendChild(prepTimeContainer);
    timingContainer.appendChild(cookTimeContainer);
    
    header.appendChild(title);
    header.appendChild(timingContainer);
    
    // Create instructions container
    const instructionsContainer = this._make('div', ['recipe-instruction-block__instructions']);
    
    // Render all instructions
    this.data.instructions.forEach((instruction, index) => {
      const instructionElement = this._createInstructionElement(instruction, index + 1);
      instructionsContainer.appendChild(instructionElement);
    });
    
    // Add instruction button
    if (!this.readOnly) {
      const addButton = this._make('button', ['recipe-instruction-block__add-instruction'], {
        type: 'button'
      });
      addButton.innerHTML = '+ Add Step';
      instructionsContainer.appendChild(addButton);
    }
    
    wrapper.appendChild(header);
    wrapper.appendChild(instructionsContainer);
    
    // Attach event listeners
    if (!this.readOnly) {
      this._attachEventListeners(wrapper);
    }
    
    return wrapper;
  }

  save(blockContent: HTMLElement): RecipeInstructionData {
    const title = blockContent.querySelector('.recipe-instruction-block__title');
    const prepTime = blockContent.querySelector('.recipe-instruction-block__prep-time');
    const cookTime = blockContent.querySelector('.recipe-instruction-block__cook-time');
    const instructionElements = blockContent.querySelectorAll('.recipe-instruction-block__instruction');
    
    const instructions: RecipeInstruction[] = [];
    instructionElements.forEach(instructionEl => {
      const instructionContent = instructionEl.querySelector('.recipe-instruction-block__instruction-content');
      const instructionTime = instructionEl.querySelector('.recipe-instruction-block__instruction-time');
      const instructionTemp = instructionEl.querySelector('.recipe-instruction-block__instruction-temperature');
      const instructionId = instructionEl.getAttribute('data-instruction-id') || this._generateId();
      
      if (instructionContent?.innerHTML.trim()) {
        instructions.push({
          id: instructionId,
          instruction: instructionContent.innerHTML,
          time: instructionTime?.innerHTML ?? '',
          temperature: instructionTemp?.innerHTML ?? ''
        });
      }
    });
    
    return {
      title: title?.innerHTML ?? 'Instructions',
      prepTime: prepTime?.innerHTML ?? '',
      cookTime: cookTime?.innerHTML ?? '',
      instructions: instructions.length > 0 ? instructions : [
        { id: this._generateId(), instruction: '', time: '', temperature: '' }
      ]
    };
  }

  validate(data: RecipeInstructionData): boolean {
    // Must have at least one instruction with content
    return data.instructions.some(instruction => instruction.instruction.trim() !== '');
  }

  private _createInstructionElement(instruction: RecipeInstruction, stepNumber: number): HTMLElement {
    const instructionWrapper = this._make('div', ['recipe-instruction-block__instruction']);
    instructionWrapper.setAttribute('data-instruction-id', instruction.id);
    
    const stepNumberEl = this._make('div', ['recipe-instruction-block__step-number']);
    stepNumberEl.textContent = `${stepNumber}.`;
    
    const instructionBody = this._make('div', ['recipe-instruction-block__instruction-body']);
    
    const instructionContent = this._make('div', ['recipe-instruction-block__instruction-content'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: instruction.instruction
    });
    instructionContent.dataset.placeholder = this.config.instructionPlaceholder || 'Describe this cooking step...';
    
    // Optional timing details
    const instructionDetails = this._make('div', ['recipe-instruction-block__instruction-details']);
    
    const timeContainer = this._make('div', ['recipe-instruction-block__detail-item']);
    const timeLabel = this._make('span', ['recipe-instruction-block__detail-label']);
    timeLabel.textContent = 'Time:';
    const time = this._make('div', ['recipe-instruction-block__instruction-time'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: instruction.time || ''
    });
    time.dataset.placeholder = '5 min';
    timeContainer.appendChild(timeLabel);
    timeContainer.appendChild(time);
    
    const tempContainer = this._make('div', ['recipe-instruction-block__detail-item']);
    const tempLabel = this._make('span', ['recipe-instruction-block__detail-label']);
    tempLabel.textContent = 'Temp:';
    const temperature = this._make('div', ['recipe-instruction-block__instruction-temperature'], {
      contentEditable: (!this.readOnly).toString(),
      innerHTML: instruction.temperature || ''
    });
    temperature.dataset.placeholder = '350°F';
    tempContainer.appendChild(tempLabel);
    tempContainer.appendChild(temperature);
    
    instructionDetails.appendChild(timeContainer);
    instructionDetails.appendChild(tempContainer);
    
    const instructionActions = this._make('div', ['recipe-instruction-block__instruction-actions']);
    
    if (!this.readOnly) {
      const deleteButton = this._make('button', ['recipe-instruction-block__delete-instruction'], {
        type: 'button',
        title: 'Delete step'
      });
      deleteButton.innerHTML = '×';
      instructionActions.appendChild(deleteButton);
    }
    
    instructionBody.appendChild(instructionContent);
    instructionBody.appendChild(instructionDetails);
    
    instructionWrapper.appendChild(stepNumberEl);
    instructionWrapper.appendChild(instructionBody);
    instructionWrapper.appendChild(instructionActions);
    
    return instructionWrapper;
  }

  private _attachEventListeners(wrapper: HTMLElement): void {
    const addButton = wrapper.querySelector('.recipe-instruction-block__add-instruction');
    const instructionsContainer = wrapper.querySelector('.recipe-instruction-block__instructions');
    
    // Add new instruction
    addButton?.addEventListener('click', () => {
      const maxInstructions = this.config.maxInstructions || 30;
      const currentInstructions = wrapper.querySelectorAll('.recipe-instruction-block__instruction').length;
      
      if (currentInstructions < maxInstructions) {
        const newInstruction = { 
          id: this._generateId(), 
          instruction: '', 
          time: '', 
          temperature: '' 
        };
        const instructionElement = this._createInstructionElement(newInstruction, currentInstructions + 1);
        instructionsContainer?.insertBefore(instructionElement, addButton);
        this._updateStepNumbers(wrapper);
        
        // Focus new instruction
        const instructionContent = instructionElement.querySelector('.recipe-instruction-block__instruction-content') as HTMLElement;
        instructionContent?.focus();
      }
    });
    
    // Delete instruction
    instructionsContainer?.addEventListener('click', (e) => {
      const deleteButton = (e.target as Element).closest('.recipe-instruction-block__delete-instruction');
      if (deleteButton) {
        const instruction = deleteButton.closest('.recipe-instruction-block__instruction');
        const allInstructions = wrapper.querySelectorAll('.recipe-instruction-block__instruction');
        
        // Don't delete if it's the last instruction
        if (allInstructions.length > 1) {
          instruction?.remove();
          this._updateStepNumbers(wrapper);
        }
      }
    });
  }

  private _updateStepNumbers(wrapper: HTMLElement): void {
    const instructions = wrapper.querySelectorAll('.recipe-instruction-block__instruction');
    instructions.forEach((instruction, index) => {
      const numberElement = instruction.querySelector('.recipe-instruction-block__step-number');
      if (numberElement) {
        numberElement.textContent = `${index + 1}.`;
      }
    });
  }

  private _generateId(): string {
    return 'instruction_' + Math.random().toString(36).substr(2, 9);
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
      title: { 
        b: true, 
        i: true, 
        strong: true, 
        em: true 
      },
      prepTime: false, // Plain text
      cookTime: false, // Plain text
      instructions: {
        id: false,
        instruction: { 
          p: true, 
          br: true, 
          strong: true, 
          em: true, 
          a: { href: true, target: '_blank' }
        },
        time: false, // Plain text
        temperature: false // Plain text
      }
    };
  }
}
