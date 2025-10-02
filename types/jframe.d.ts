declare module 'jframe' {
  export class Jframe {
    constructor();
    compile(template: string): (context: object) => string;
    render(target: string | HTMLElement, context?: object, enableBinding?: boolean): string | HTMLElement;
    update(element: HTMLElement, newContext?: object): HTMLElement;
    destroy(): void;
  }
  
  export const jframe: Jframe;
}

// Template context interface
interface TemplateContext {
  [key: string]: any;
}