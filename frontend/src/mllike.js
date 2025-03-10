// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("codemirror/lib/codemirror"));
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    CodeMirror.defineMode('mllike', function(config, parserConfig) {
        var expressions = {
            // match a line beginning with 0 or more whitespaces
            // and a vertical bar at the end
            '^\\s*\\|': {
                indentCurrentLine: true,
                dedentNewLine: true
            },
            // match a line beginning with 0 or more whitespaces
            // and a end of block comment *)
            '^\\s*\\*\\)': {
                dedentCurrentLine: true,
                allowInComments: true
            }
        };

        var words = {
            'let': {
                type: 'keyword',
                indentNewLine: true
            },
            'rec': {
                type: 'keyword'
            },
            'in': {
                type: 'keyword',
                indentNewLine: true,
                dedentCurrentLine: true
            },
            'and': {
                type: 'keyword'
            },
            'if': {
                type: 'keyword',
                indentNewLine: true
            },
            'then': {
                type: 'keyword',
                indentNewLine: true
            },
            'else': {
                type: 'keyword',
                indentNewLine: true
            },
            'for': {
                type: 'keyword'
            },
            'do': {
                type: 'keyword'
            },
            'of': {
                type: 'keyword',
                indentNewLine: true
            },
            'while': {
                type: 'keyword'
            },
            'fun': {
                type: 'keyword',
                indentNewLine: true
            },
            'val': {
                type: 'keyword',
                indentNewLine: true
            },
            'type': {
                type: 'keyword'
            },
            'match': {
                type: 'keyword'
            },
            'with': {
                type: 'keyword'
            },
            'try': {
                type: 'keyword'
            },
            'open': {
                type: 'builtin'
            },
            'begin': {
                type: 'keyword',
                indentNewLine: true
            },
            'end': {
                type: 'keyword',
                dedentNewLine: true
            }
        };

        function decreaseIndentIfPositive (state) {
            if (state.indentChange >= 0) {
                state.indentChange -= config.indentUnit;
            }
        }

        function increaseIndent (state) {
            state.indentChange += config.indentUnit;
        }

        function decreaseIndent (state) {
            state.indentChange -= config.indentUnit;
        }

        var extraWords = parserConfig.extraWords || {};
        for (var prop in extraWords) {
            if (extraWords.hasOwnProperty(prop)) {
                words[prop] = parserConfig.extraWords[prop];
            }
        }

        var electricRegex = "(";
        // generate electricInput regular expression
        for (var word in words) {
            // go through all words and test if they have the dedent property set
            if (words.hasOwnProperty(word)) {
                var wordObject = words[word];

                //if it is set, add them to the regex
                if (wordObject.hasOwnProperty('dedentCurrentLine') && wordObject.dedentCurrentLine) {
                    electricRegex += word + '|';
                } else if (wordObject.hasOwnProperty('indentCurrentLine') && wordObject.indentCurrentLine) {
                    electricRegex += word + '|';
                }
            }
        }

        //do the same for the native regular expressions
        for (var regex in expressions) {
            if (expressions.hasOwnProperty(regex)) {
                var regexObject = expressions[regex];

                //if it is set, add them to the regex
                if (regexObject.hasOwnProperty('dedentCurrentLine') && regexObject.dedentCurrentLine) {
                    electricRegex += regex + '|';
                } else if (regexObject.hasOwnProperty('indentCurrentLine') && regexObject.indentCurrentLine) {
                    electricRegex += regex + '|';
                }
            }
        }

        // cut off the last trailing |
        var regexLength = electricRegex.length;
        // do not cut off the last character if no word has been added to the regex
        if (regexLength > 1) {
            //cut off the last character
            electricRegex = electricRegex.slice(0,-1);
        }
        // finish the regex
        electricRegex += ')$';

        function tokenBase(stream, state) {
            var ch = stream.next();

            if (ch === '"') {
                state.tokenize = tokenString;
                return state.tokenize(stream, state);
            }
            if (ch === '(') {
                if (stream.eat('*')) {
                    increaseIndent(state);

                    state.commentLevel++;
                    // replace the tokenize function for the further characters
                    state.tokenize = tokenComment;

                    return state.tokenize(stream, state);
                }
            }
            if (ch === '~') {
                stream.eatWhile(/\w/);
                return 'variable-2';
            }
            if (ch === '`') {
                stream.eatWhile(/\w/);
                return 'quote';
            }
            if (ch === '/' && parserConfig.slashComments && stream.eat('/')) {
                stream.skipToEnd();
                return 'comment';
            }

            /* match digits */
            if (/\d/.test(ch)) {
                stream.eatWhile(/[\d]/);
                /* match floating numbers */
                if (stream.eat('.')) {
                    stream.eatWhile(/[\d]/);
                }

                decreaseIndentIfPositive(state);

                return 'number';
            }
            if ( /[+\-*&%=<>!?|]/.test(ch)) {

                increaseIndent(state);

                if (ch === '=') {
                    state.indentChange = 2;
                }

                if (ch === '=' && (stream.eat('>') || stream.eat('<'))) {
                    state.indentChange = 2;
                }

                return 'operator';
            }

            if (/[\w\xa1-\uffff]/.test(ch)) {
                stream.eatWhile(/[\w\xa1-\uffff]/);
                var cur = stream.current();

                if (words.hasOwnProperty(cur)) {

                    var matchedObject = words[cur];
                    var shouldIndent = matchedObject.hasOwnProperty('indentNewLine')
                        && matchedObject.indentNewLine;

                    if (shouldIndent) {
                        increaseIndent(state);
                    }

                    var shouldDedent = matchedObject.hasOwnProperty('dedentNewLine')
                        && matchedObject.dedentNewLine;

                    if (shouldDedent) {
                        decreaseIndent(state);
                    }

                    return matchedObject.type;
                } else {

                    decreaseIndentIfPositive(state);

                    return 'variable';
                }
            }

            return null;
        }

        function tokenString(stream, state) {
            var next, end = false, escaped = false;
            while ((next = stream.next()) != null) {
                if (next === '"' && !escaped) {
                    end = true;
                    break;
                }
                escaped = !escaped && next === '\\';
            }
            if (end && !escaped) {
                state.tokenize = tokenBase;
            }
            return 'string';
        }

        function tokenComment(stream, state) {
            var prev, next;
            while(state.commentLevel > 0 && (next = stream.next()) != null) {
                if (prev === '(' && next === '*') {
                    increaseIndent(state);
                    state.commentLevel++;
                }
                if (prev === '*' && next === ')') {

                    // decrease the indent manually if the electric regex does not
                    if (!/'^\s*\*\)'/.test(stream.string)) {
                        decreaseIndent(state);
                    }

                    state.commentLevel--;
                }
                prev = next;
            }
            if (state.commentLevel <= 0) {
                // reset the tokenize function after the comment end
                state.tokenize = tokenBase;
            }
            return 'comment';
        }

        return {
            startState: function() {
                return {
                    tokenize: tokenBase,
                    commentLevel: 0,
                    currentIndent: 0,
                    indentChange: 0

                };
            },
            token: function(stream, state) {
                if (stream.sol()) {
                    //save the current indentation
                    state.currentIndent = stream.indentation();
                    //reset the indentation change from the line before
                    state.indentChange = 0;

                    for (var regex in expressions) {
                        if (expressions.hasOwnProperty(regex)) {

                            if(stream.match(new RegExp(regex), false)) {

                                const regexObject = expressions[regex];

                                const shouldDedent = regexObject.hasOwnProperty('dedentNewLine') && regexObject.dedentNewLine;

                                /* Overwrite the start of the next line */
                                if (shouldDedent) {
                                    state.currentIndent -= config.indentUnit;
                                }

                            }
                        }
                    }
                }

                if (stream.eatSpace())
                    return null;

                return state.tokenize(stream, state);
            },
            indent: function(state, textAfter) {

                if (words.hasOwnProperty(textAfter)) {

                    const matchedObject = words[textAfter];

                    const shouldDedent = matchedObject.hasOwnProperty('dedentCurrentLine')
                        && matchedObject.dedentCurrentLine;

                    if (shouldDedent) {
                        decreaseIndent(state);
                    }

                    const shouldIndent = matchedObject.hasOwnProperty('indentCurrentLine')
                        && matchedObject.indentCurrentLine;

                    if (shouldIndent) {
                        increaseIndent(state);
                    }
                }

                //do the same for the native regular expressions
                for (var regex in expressions) {
                    if (expressions.hasOwnProperty(regex)) {
                        var regexObject = expressions[regex];

                        if (!new RegExp(regex).test(textAfter))
                            continue;

                        //if it is set, add them to the regex
                        if (regexObject.hasOwnProperty('dedentCurrentLine') && regexObject.dedentCurrentLine) {
                            decreaseIndent(state);
                        } else if (regexObject.hasOwnProperty('indentCurrentLine') && regexObject.indentCurrentLine) {
                            increaseIndent(state);
                        }
                    }
                }

                var newIndent = state.currentIndent + state.indentChange;

                //return 0 if the new indent is smaller than 0
                return newIndent < 0 ? 0 : newIndent;
            },

            electricInput: new RegExp(electricRegex),
            blockCommentStart: "(*",
            blockCommentEnd: "*)",
            lineComment: parserConfig.slashComments ? "//" : null,
            fold: "sml"
        };
    });

    CodeMirror.defineMIME('text/sml', {
        name: 'mllike',
        extraWords: {
            'datatype': {
                type: 'keyword'
            },
            'abstype': {
                type: 'keyword'
            },
            'exception': {
                type: 'keyword'
            },
            'local': {
                type: 'keyword',
                indentNewLine: true
            },
            'eqtype': {
                type: 'keyword'
            },
            'functor': {
                type: 'keyword'
            },
            'include': {
                type: 'keyword'
            },
            'sharing': {
                type: 'keyword'
            },
            'sig': {
                type: 'keyword',
                indentNewLine: true
            },
            'signature': {
                type: 'keyword'
            },
            'struct': {
                type: 'keyword',
                indentNewLine: true
            },
            'structure': {
                type: 'keyword'
            },
            'where': {
                type: 'keyword'
            },
            'andalso': {
                type: 'keyword'
            },
            'as': {
                type: 'keyword'
            },
            'case': {
                type: 'keyword',
                indentNewLine: true
            },
            'fn': {
                type: 'keyword'
            },
            'handle': {
                type: 'keyword'
            },
            'infix': {
                type: 'keyword'
            },
            'infixr': {
                type: 'keyword'
            },
            'nonfix': {
                type: 'keyword'
            },
            'op': {
                type: 'keyword'
            },
            'orelse': {
                type: 'keyword'
            },
            'raise': {
                type: 'keyword'
            },
            'rec': {
                type: 'keyword'
            },
            'withtype': {
                type: 'keyword'
            },
            ':>': {
                type: 'keyword'
            },
            '...': {
                type: 'keyword'
            },
            '_': {
                type: 'keyword'
            },

            'unit': {
                type: 'builtin',
                dedentNewLine: true
            },
            'bool': {
                type: 'builtin',
                dedentNewLine: true
            },
            'int': {
                type: 'builtin',
                dedentNewLine: true
            },
            'word': {
                type: 'builtin',
                dedentNewLine: true
            },
            'real': {
                type: 'builtin',
                dedentNewLine: true
            },
            'string': {
                type: 'builtin',
                dedentNewLine: true
            },
            'char': {
                type: 'builtin',
                dedentNewLine: true
            },
            'list': {
                type: 'builtin',
                dedentNewLine: true
            },
            'ref': {
                type: 'builtin'
            },
            'exn': {
                type: 'builtin'
            },

            'true': {
                type: 'atom',
                dedentNewLine: true
            },
            'false': {
                type: 'atom',
                dedentNewLine: true
            },
            'nil': {
                type: 'atom',
                dedentNewLine: true
            },
            '::': {
                type: 'atom'
            },
            'Bind': {
                type: 'atom'
            },
            'div': {
                type: 'atom'
            },
            'mod': {
                type: 'atom'
            },
            'abs': {
                type: 'atom'
            },
            'Match': {
                type: 'atom'
            }
        }
    });
});
