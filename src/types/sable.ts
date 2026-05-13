export interface SableRead {
  title: string;
  signal: string;
  pattern: string;
  edge: string;
  bestUseOfRecursum: string;
  closingLine: string;
}

export interface RecursumInstructions {
  title: string;
  copyBlock: string;
  primarySignal?: string;
  responseStyle?: string;
  challengeRules: string[];
  frictionWatch: string[];
  decisionSupport?: string;
  pacingRegulation?: string;
  directionalFilter?: string;
}

export interface SableInterpreterOutput {
  sableRead: SableRead;
  recursumInstructions: RecursumInstructions;
}
