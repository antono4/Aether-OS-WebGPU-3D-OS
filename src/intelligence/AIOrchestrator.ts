/**
 * Aether OS - AI Orchestrator
 * Generative Micro-Tools from natural language prompts
 */

import { EventBus, Events } from '../core/EventBus';

export interface ToolComponent {
  type: string;
  props: Record<string, any>;
}

export interface GeneratedTool {
  id: string;
  name: string;
  description: string;
  intent: string;
  components: ToolComponent[];
  data: any;
}

// Component Library - Pre-built UI components
export const ComponentLibrary = {
  // Table Component
  table: (data: any[]) => ({
    type: 'table',
    props: {
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      rows: data,
      headers: data.length > 0 ? Object.keys(data[0]).map(k => k.replace(/([A-Z])/g, ' $1').trim()) : []
    }
  }),

  // Chart Component
  chart: (type: 'bar' | 'line' | 'pie', data: any[], options: any = {}) => ({
    type: 'chart',
    props: {
      chartType: type,
      labels: data.map(d => d.label || d.name || d.category || ''),
      values: data.map(d => d.value || d.amount || d.count || 0),
      colors: options.colors || ['#00d9ff', '#ff00ff', '#00ff88', '#ffaa00', '#ff6b6b'],
      title: options.title || 'Chart'
    }
  }),

  // Calculator Component
  calculator: (initialValue?: number) => ({
    type: 'calculator',
    props: {
      initialValue: initialValue || 0,
      buttons: ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'],
      history: []
    }
  }),

  // Form Component
  form: (fields: string[], action?: string) => ({
    type: 'form',
    props: {
      fields: fields.map(f => ({
        name: f.toLowerCase().replace(/\s+/g, '_'),
        label: f,
        type: 'text',
        placeholder: `Enter ${f.toLowerCase()}...`
      })),
      action: action || 'submit',
      method: 'POST'
    }
  }),

  // Metric Card Component
  metric: (value: number, label: string, trend?: 'up' | 'down' | 'neutral') => ({
    type: 'metric',
    props: {
      value,
      label,
      trend: trend || 'neutral',
      trendValue: trend === 'up' ? '+5%' : trend === 'down' ? '-3%' : '0%'
    }
  }),

  // Text Editor Component
  editor: (content: string, mode: 'markdown' | 'plain' = 'markdown') => ({
    type: 'editor',
    props: {
      content,
      mode,
      placeholder: 'Start typing...'
    }
  }),

  // List Component
  list: (items: string[], ordered: boolean = false) => ({
    type: 'list',
    props: {
      items,
      ordered
    }
  })
};

// Intent patterns for parsing natural language
const IntentPatterns = {
  calculate: {
    patterns: [
      /calculate\s+(.+)/i,
      /compute\s+(.+)/i,
      /how\s+much\s+is\s+(.+)/i,
      /(\d+)\s*[\+\-\*\/]\s*(\d+)/i,
      /sum\s+(?:of\s+)?(.+)/i
    ],
    intent: 'calculate'
  },
  visualize: {
    patterns: [
      /show\s+(?:me\s+)?(?:a\s+)?(?:chart|graph|visualization)\s+(?:of|for)\s+(.+)/i,
      /visualize\s+(.+)/i,
      /plot\s+(.+)/i,
      /display\s+(.+)\s+as\s+(?:a\s+)?(?:chart|graph)/i
    ],
    intent: 'visualize'
  },
  create: {
    patterns: [
      /create\s+(?:a\s+)?(.+)/i,
      /make\s+(?:a\s+)?(.+)/i,
      /generate\s+(?:a\s+)?(.+)/i,
      /build\s+(?:a\s+)?(.+)/i
    ],
    intent: 'create'
  },
  compare: {
    patterns: [
      /compare\s+(.+)\s+(?:to|with|and)\s+(.+)/i,
      /difference\s+between\s+(.+)\s+and\s+(.+)/i
    ],
    intent: 'compare'
  },
  analyze: {
    patterns: [
      /analyze\s+(.+)/i,
      /what\s+is\s+(?:the|my)\s+(.+)/i,
      /summary\s+of\s+(.+)/i
    ],
    intent: 'analyze'
  },
  query: {
    patterns: [
      /search\s+(?:for\s+)?(.+)/i,
      /find\s+(?:me\s+)?(.+)/i,
      /show\s+(?:me\s+)?(.+)/i,
      /list\s+(?:all\s+)?(.+)/i
    ],
    intent: 'query'
  }
};

export class AIOrchestrator {
  eventBus: EventBus;
  tools: Map<string, GeneratedTool> = new Map();
  private toolIdCounter: number = 0;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for memory updates to provide context
    this.eventBus.on(Events.MEMORY_STORED, (data) => {
      console.log('[AI] Memory stored, AI context updated:', data);
    });
  }

  /**
   * Parse user intent from natural language
   */
  parseIntent(input: string): { intent: string; entities: any; confidence: number } {
    const normalized = input.toLowerCase().trim();

    for (const [intentName, config] of Object.entries(IntentPatterns)) {
      for (const pattern of config.patterns) {
        const match = normalized.match(pattern);
        if (match) {
          const entities = match.slice(1).filter(Boolean);
          return {
            intent: config.intent,
            entities: entities.length === 1 ? entities[0] : entities,
            confidence: 0.9
          };
        }
      }
    }

    // Default to query intent
    return {
      intent: 'query',
      entities: normalized,
      confidence: 0.5
    };
  }

  /**
   * Generate a Micro-Tool based on parsed intent
   */
  async generateTool(input: string): Promise<GeneratedTool | null> {
    this.eventBus.emit(Events.INTENT_RECEIVED, { input });

    try {
      const { intent, entities, confidence } = this.parseIntent(input);
      
      this.eventBus.emit(Events.TOOL_GENERATING, { intent, entities });

      let tool: GeneratedTool | null = null;

      switch (intent) {
        case 'calculate':
          tool = this.generateCalculationTool(input, entities);
          break;
        case 'visualize':
          tool = this.generateVisualizationTool(input, entities);
          break;
        case 'create':
          tool = this.generateCreateTool(input, entities);
          break;
        case 'compare':
          tool = this.generateComparisonTool(input, entities);
          break;
        case 'analyze':
          tool = this.generateAnalysisTool(input, entities);
          break;
        case 'query':
        default:
          tool = this.generateQueryTool(input, entities);
          break;
      }

      if (tool) {
        this.tools.set(tool.id, tool);
        this.eventBus.emit(Events.TOOL_GENERATED, tool);
        return tool;
      }

      throw new Error('Failed to generate tool');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.eventBus.emit(Events.TOOL_ERROR, { error: errorMsg, input });
      return this.fallbackTool(input);
    }
  }

  private generateCalculationTool(input: string, entities: any): GeneratedTool {
    // Extract numbers from input
    const numbers = input.match(/\d+/g)?.map(Number) || [0];
    const operators = input.match(/[\+\-\*\/]/g) || ['+'];

    let result = numbers[0];
    for (let i = 0; i < operators.length && i + 1 < numbers.length; i++) {
      const num = numbers[i + 1];
      switch (operators[i]) {
        case '+': result += num; break;
        case '-': result -= num; break;
        case '*': result *= num; break;
        case '/': result = num !== 0 ? result / num : 0; break;
      }
    }

    return {
      id: `tool-${++this.toolIdCounter}`,
      name: 'Calculator',
      description: `Calculate: ${input}`,
      intent: 'calculate',
      components: [ComponentLibrary.calculator(result)],
      data: { expression: input, result }
    };
  }

  private generateVisualizationTool(input: string, entities: any): GeneratedTool {
    // Generate sample data based on entities
    const sampleData = [
      { label: 'Item A', value: Math.random() * 100 },
      { label: 'Item B', value: Math.random() * 100 },
      { label: 'Item C', value: Math.random() * 100 },
      { label: 'Item D', value: Math.random() * 100 },
      { label: 'Item E', value: Math.random() * 100 }
    ];

    // Determine chart type
    const chartType = input.includes('pie') ? 'pie' : 
                      input.includes('line') ? 'line' : 'bar';

    return {
      id: `tool-${++this.toolIdCounter}`,
      name: 'Data Visualization',
      description: `Visualize: ${entities}`,
      intent: 'visualize',
      components: [
        ComponentLibrary.chart(chartType, sampleData, { title: String(entities) }),
        ComponentLibrary.table(sampleData)
      ],
      data: sampleData
    };
  }

  private generateCreateTool(input: string, entities: any): GeneratedTool {
    return {
      id: `tool-${++this.toolIdCounter}`,
      name: 'Content Creator',
      description: `Create: ${entities}`,
      intent: 'create',
      components: [
        ComponentLibrary.editor('', 'markdown'),
        ComponentLibrary.metric(0, 'Words'),
        ComponentLibrary.metric(0, 'Characters')
      ],
      data: { template: entities }
    };
  }

  private generateComparisonTool(input: string, entities: any): GeneratedTool {
    const items = Array.isArray(entities) ? entities : [entities, 'baseline'];
    
    return {
      id: `tool-${++this.toolIdCounter}`,
      name: 'Comparison Tool',
      description: `Compare ${items.join(' vs ')}`,
      intent: 'compare',
      components: [
        ComponentLibrary.metric(Math.random() * 100, String(items[0])),
        ComponentLibrary.metric(Math.random() * 100, String(items[1])),
        ComponentLibrary.chart('bar', [
          { label: items[0], value: Math.random() * 100 },
          { label: items[1], value: Math.random() * 100 }
        ])
      ],
      data: { items }
    };
  }

  private generateAnalysisTool(input: string, entities: any): GeneratedTool {
    return {
      id: `tool-${++this.toolIdCounter}`,
      name: 'Analysis Tool',
      description: `Analyze: ${entities}`,
      intent: 'analyze',
      components: [
        ComponentLibrary.metric(Math.floor(Math.random() * 100), 'Score', 'up'),
        ComponentLibrary.metric(Math.floor(Math.random() * 50), 'Items'),
        ComponentLibrary.list(['Finding 1', 'Finding 2', 'Finding 3'], true)
      ],
      data: { subject: entities }
    };
  }

  private generateQueryTool(input: string, entities: any): GeneratedTool {
    return {
      id: `tool-${++this.toolIdCounter}`,
      name: 'Search Results',
      description: `Results for: ${entities}`,
      intent: 'query',
      components: [
        ComponentLibrary.list([
          `Result: ${entities} - 1`,
          `Result: ${entities} - 2`,
          `Result: ${entities} - 3`
        ])
      ],
      data: { query: entities }
    };
  }

  private fallbackTool(input: string): GeneratedTool {
    return {
      id: `tool-${++this.toolIdCounter}`,
      name: 'General Response',
      description: `Response to: ${input.substring(0, 50)}...`,
      intent: 'fallback',
      components: [
        ComponentLibrary.editor(`AI Response: ${input}\n\nThis is a simulated AI response. Configure an API key for real AI processing.`, 'markdown')
      ],
      data: { originalInput: input }
    };
  }

  /**
   * Render a tool's components to HTML
   */
  renderTool(tool: GeneratedTool): HTMLElement {
    const container = document.createElement('div');
    container.className = 'micro-tool';
    container.dataset.toolId = tool.id;

    // Tool header
    const header = document.createElement('div');
    header.className = 'tool-header';
    header.innerHTML = `
      <h3>${tool.name}</h3>
      <p>${tool.description}</p>
      <span class="tool-intent">${tool.intent}</span>
    `;
    container.appendChild(header);

    // Tool content
    const content = document.createElement('div');
    content.className = 'tool-content';

    tool.components.forEach(component => {
      const el = this.renderComponent(component);
      if (el) content.appendChild(el);
    });

    container.appendChild(content);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tool-close';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => container.remove();
    container.appendChild(closeBtn);

    return container;
  }

  private renderComponent(component: ToolComponent): HTMLElement | null {
    switch (component.type) {
      case 'table':
        return this.renderTable(component.props);
      case 'chart':
        return this.renderChart(component.props);
      case 'calculator':
        return this.renderCalculator(component.props);
      case 'metric':
        return this.renderMetric(component.props);
      case 'editor':
        return this.renderEditor(component.props);
      case 'list':
        return this.renderList(component.props);
      case 'form':
        return this.renderForm(component.props);
      default:
        return null;
    }
  }

  private renderTable(props: any): HTMLElement {
    const table = document.createElement('div');
    table.className = 'tool-table';

    if (props.rows && props.rows.length > 0) {
      const headers = props.headers || props.columns;
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headers.forEach((h: string) => {
        const th = document.createElement('th');
        th.textContent = h;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      const tbody = document.createElement('tbody');
      props.rows.slice(0, 10).forEach((row: any) => {
        const tr = document.createElement('tr');
        Object.values(row).forEach((val: any) => {
          const td = document.createElement('td');
          td.textContent = String(val);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
    } else {
      table.textContent = 'No data available';
    }

    return table;
  }

  private renderChart(props: any): HTMLElement {
    const chart = document.createElement('div');
    chart.className = 'tool-chart';

    // Simple ASCII-style chart for demonstration
    const maxVal = Math.max(...props.values, 1);
    let ascii = `<div class="chart-title">${props.title}</div><div class="chart-bars">`;
    
    props.labels.forEach((label: string, i: number) => {
      const height = (props.values[i] / maxVal) * 100;
      const color = props.colors[i % props.colors.length];
      ascii += `
        <div class="chart-bar-container">
          <div class="chart-bar" style="height: ${height}%; background: ${color};"></div>
          <div class="chart-label">${label}</div>
          <div class="chart-value">${props.values[i].toFixed(1)}</div>
        </div>
      `;
    });
    
    ascii += '</div>';
    chart.innerHTML = ascii;
    return chart;
  }

  private renderCalculator(props: any): HTMLElement {
    const calc = document.createElement('div');
    calc.className = 'tool-calculator';
    calc.innerHTML = `
      <input type="text" class="calc-display" value="${props.initialValue}" readonly />
      <div class="calc-buttons">
        ${props.buttons.map((btn: string) => `<button data-action="${btn}">${btn}</button>`).join('')}
      </div>
    `;
    return calc;
  }

  private renderMetric(props: any): HTMLElement {
    const metric = document.createElement('div');
    metric.className = `tool-metric trend-${props.trend}`;
    metric.innerHTML = `
      <div class="metric-value">${typeof props.value === 'number' ? props.value.toLocaleString() : props.value}</div>
      <div class="metric-label">${props.label}</div>
      ${props.trendValue ? `<div class="metric-trend">${props.trendValue}</div>` : ''}
    `;
    return metric;
  }

  private renderEditor(props: any): HTMLElement {
    const editor = document.createElement('div');
    editor.className = 'tool-editor';
    editor.innerHTML = `
      <textarea class="editor-content" placeholder="${props.placeholder || 'Start typing...'}">${props.content || ''}</textarea>
    `;
    return editor;
  }

  private renderList(props: any): HTMLElement {
    const list = document.createElement('div');
    list.className = 'tool-list';
    const Tag = props.ordered ? 'ol' : 'ul';
    const listElement = document.createElement(Tag);
    props.items.forEach((item: string) => {
      const li = document.createElement('li');
      li.textContent = item;
      listElement.appendChild(li);
    });
    list.appendChild(listElement);
    return list;
  }

  private renderForm(props: any): HTMLElement {
    const form = document.createElement('div');
    form.className = 'tool-form';
    props.fields.forEach((field: any) => {
      const fieldEl = document.createElement('div');
      fieldEl.className = 'form-field';
      fieldEl.innerHTML = `
        <label>${field.label}</label>
        <input type="${field.type}" placeholder="${field.placeholder || ''}" name="${field.name}" />
      `;
      form.appendChild(fieldEl);
    });
    return form;
  }

  getTool(toolId: string): GeneratedTool | undefined {
    return this.tools.get(toolId);
  }

  getAllTools(): GeneratedTool[] {
    return Array.from(this.tools.values());
  }

  deleteTool(toolId: string): boolean {
    return this.tools.delete(toolId);
  }
}
