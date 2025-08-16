export abstract class BaseNode {
  protected params: Record<string, any> = {};
  protected nextNodes: BaseNode[] = [];
  protected conditions: Array<{ condition: (result: any) => boolean; node: BaseNode }> = [];

  setParams(params: Record<string, any>): BaseNode {
    this.params = { ...this.params, ...params };
    return this;
  }

  next(...nodes: BaseNode[]): BaseNode {
    this.nextNodes.push(...nodes);
    return this;
  }

  when(condition: (result: any) => boolean, node: BaseNode): BaseNode {
    this.conditions.push({ condition, node });
    return this;
  }

  chain(node: BaseNode): BaseNode {
    return this.next(node);
  }

  abstract prep(): Promise<void> | void;
  abstract exec(): Promise<any> | any;
  abstract post(result: any): Promise<void> | void;

  async execute(): Promise<any> {
    await this.prep();
    const result = await this.exec();
    await this.post(result);
    return result;
  }

  async getNextNode(result: any): Promise<BaseNode | null> {
    // Check conditions first
    for (const { condition, node } of this.conditions) {
      if (condition(result)) {
        return node;
      }
    }

    // Return first next node if no conditions match
    return this.nextNodes.length > 0 ? this.nextNodes[0] : null;
  }

  async run(): Promise<any> {
    const result = await this.execute();
    const nextNode = await this.getNextNode(result);
    
    if (nextNode) {
      return await nextNode.run();
    }
    
    return result;
  }
}