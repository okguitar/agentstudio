/**
 * 异步消息队列，用于持续向 Claude 提供用户输入
 * 实现 Streaming Input Mode 的核心组件
 */
export class MessageQueue {
  private queue: any[] = [];
  private resolvers: Array<(value: any) => void> = [];
  private isEnded = false;

  /**
   * 异步迭代器实现，用于 Claude SDK 的 streaming input
   */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<any> {
    while (!this.isEnded || this.queue.length > 0) {
      if (this.queue.length > 0) {
        yield this.queue.shift();
      } else if (!this.isEnded) {
        // 等待新消息
        yield new Promise<any>(resolve => this.resolvers.push(resolve));
      }
    }
  }

  /**
   * 向队列中添加消息
   * @param message 要添加的消息
   */
  push(message: any): void {
    if (this.isEnded) {
      console.warn('Cannot push to ended message queue');
      return;
    }

    if (this.resolvers.length > 0) {
      // 有等待的消费者，直接解析
      const resolve = this.resolvers.shift()!;
      resolve(message);
    } else {
      // 没有等待的消费者，加入队列
      this.queue.push(message);
    }
  }

  /**
   * 结束队列，不再接收新消息
   */
  end(): void {
    this.isEnded = true;
    // 解析所有等待的 promise
    this.resolvers.forEach(resolve => resolve(null));
    this.resolvers = [];
  }

  /**
   * 检查队列是否已结束
   */
  isFinished(): boolean {
    return this.isEnded;
  }

  /**
   * 获取当前队列长度
   */
  size(): number {
    return this.queue.length;
  }
}