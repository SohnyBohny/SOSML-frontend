
// currently this is the index of a character in the input string
// TODO: maybe change this to line and column number
export type Position = number;

export interface CompilerMessage {
    message: string;
    position: Position;
}

// A general compiler error. Different translation phases may derive their own, more specialized error classes.
export class CompilerError extends Error implements CompilerMessage {
    constructor(message: string, public position: Position) {
        super('error:' + position + ': ' + message);
    }
}

// Used for errors that Never Happen™. Any InternalCompilerError occurring is a bug in the interpreter, regardless
// of how absurd the input is.
export class InternalCompilerError extends CompilerError {
    constructor(position: Position, message: string = 'internal compiler error') { super(message, position); }
}

// Used if the code may be valid SML, but uses a feature that this interpreter does not implement, e.g. references.
export class FeatureNotImplementedError extends CompilerError {
    constructor(message: string, position: Position) { super(message, position); }
}

// Used if the code may be valid SML, but uses a feature that is currently disabled in the interpreter settings.
export class FeatureDisabledError extends CompilerError {
    constructor(message: string, position: Position) { super(message, position); }
}
