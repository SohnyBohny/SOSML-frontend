/* TODO: tests
*/

import {IntegerConstantToken} from "../src/lexer";
const API = require("../src/lexer");

it("very basic test", () => {
    expect(API.lex("abc 1234")).toEqual([new API.IdentifierToken("abc", 0), new API.NumericToken("1234", 4, 1234)]);
});

it("code snippet", () => {
    let testcase: string = `(* Parsercomb -- Hutton/Paulson-style parser combinators for Moscow ML.
   Fritz Henglein, Ken Friis Larsen, Peter Sestoft.
   Documentation by sestoft@dina.kvl.dk.  Version 0.4 of 2000-04-30 *)

structure Parsercomb :> Parsercomb =
struct

    datatype 'elm stream =
	S of int * (int -> ('elm * 'elm stream) option)

    type ('elm,'res) parser = 'elm stream -> ('res * 'elm stream) option

    fun stream get src =
	let fun next src n = 
	        case get src of
		    SOME(x, rest) => SOME(x, S(n+1, next rest))
		  | NONE          => NONE
	in S(0, next src) end

    fun getItem (S(n, next)) = next n

    exception Parse of string

    infix 6 $-- --$ #-- --#
    infix 5 --
    infix 3 >> >>*
    infix 2 >>=
    infix 0 ||

    fun commitChar expected par (strm as S(n, next)) = 
	case par strm of 
	    NONE => 
		raise Parse (String.concat 
			     ["Expected <", expected, "> but found <", 
			      (case next n of
				   NONE       => "eof>"
				 | SOME(c, _) => str c ^ ">"),
			      " at character number ", Int.toString n]) 
	  | res as SOME _ => res

    fun commitElem expected show par (strm as S(n, next)) = 
	case par strm of 
	    NONE => 
		raise Parse (String.concat 
			     ["Expected <", expected, "> but found <", 
			      (case next n of
				   NONE         => "eof>"
				 | SOME(elm, _) => show elm ^ ">"),
			      " at element number ", Int.toString n]) 
	  | res as SOME _ => res
		    
    fun scan (scanner : ('a, 'a stream) StringCvt.reader -> 'a stream -> 'b) =
	scanner getItem 

    fun (par1 >>= parf2) strm =
	case par1 strm of
	    SOME(b, strm1) => parf2 b strm1
	  | NONE           => NONE

    fun success x strm = SOME(x, strm)

    fun failure strm = NONE

    fun eof r strm = 
	case getItem strm of
	    NONE       => SOME(r, strm)
	  | SOME(c, _) => NONE

    (* fun (par >> f) = par >>= (success o f) *)

    fun (par >> f) strm = 
	case par strm of
	    SOME(x, strm1) => SOME(f x, strm1)
	  | _              => NONE

    fun (par >>* f) strm = 
	case par strm of
	    SOME(x, strm1) => 
		(case f x of 
		     SOME y => SOME(y, strm1)
		   | NONE   => NONE)
	  | _              => NONE

    (* fun (par1 -- par2) = par1 >>= (fn r1 => par2 >> (fn r2 => (r1, r2))) *)

    fun (par1 -- par2) strm =
	case par1 strm of
	    SOME(r1, strm1) => (case par2 strm1 of
				    SOME(r2 , strm2) => SOME((r1,r2), strm2)
				  | NONE => NONE)
	  | NONE => NONE
		
    (* fun (par1 #-- par2) = (par1 -- par2) >> #2 *)

    (* Define explicitly to make par2 a tail call; possible because no
       backtracking over par1: *)

    fun (par1 #-- par2) strm = 
	case par1 strm of
	    SOME (_, strm1) => par2 strm1
	  | NONE            => NONE

    fun (par1 --# par2) = (par1 -- par2) >> #1 
	
    fun (par1 || par2) strm =
	case par1 strm of
	    NONE => par2 strm
	  | res  => res

    fun skipWS par strm = par (StringCvt.skipWS getItem strm)

    fun optional par strm0 =
	case par strm0 of
	    SOME(x, strm1) => SOME(SOME x, strm1)
	  | NONE           => SOME(NONE,   strm0)
		
    fun repeat0 par strm =
	let fun loop strm0 res =
	        case par strm0 of
		    SOME(x, strm1) => loop strm1 (x::res)
		  | NONE           => SOME(List.rev res, strm0)
	in loop strm [] end

    fun repeat1 par = par -- repeat0 par

    fun $ s strm0 =
	let val len = size s
	    val sub = String.sub
	    infix sub
	    fun loop n strm =
		if n = len then SOME(s, strm)
		else (case getItem strm of
			  SOME(c, rest) => 
			      if c = (s sub n) then loop (n+1) rest
			      else NONE
			| NONE => NONE)
	in loop 0 strm0 end
    
    fun (s $-- par) = $ s -- par >> #2

    fun (par --$ s) = par -- $ s >> #1

    fun getChar pred strm =
	case getItem strm of
	    res as SOME(c, src) => if pred c then res 
				   else NONE
	  | NONE => NONE

    fun $# elm strm = 
	case getItem strm of
	    res as SOME(x, src) => if x = elm then res 
				   else NONE
	  | NONE => NONE

    val getLit = $#

    fun getChars0 pred strm = 
	SOME(StringCvt.splitl pred getItem strm)

    fun getChars1 pred strm =
	case StringCvt.splitl pred getItem strm of
	    ("", _) => NONE
	  | res     => SOME res

    fun getChars1 pred = 
	repeat1 (getChar pred) >> op:: >> String.implode
	
    val getElem = getChar

    fun getElems0 pred = repeat0 (getElem pred) 

    fun getElems1 pred = repeat1 (getElem pred)  

    fun compose(par1, par2) strm = 
	let val par1stream = stream par1 strm
	in par2 par1stream end

    fun parse (par : ('a, 'b) parser) (strm : 'a stream) : 'b option = 
	case par strm of
	    NONE          => NONE
	  | SOME (res, _) => SOME res

    fun scanSubstr par sus = parse par (stream Substring.getc sus)

    fun scanString par s = scanSubstr par (Substring.all s)

    fun scanList par cs = parse par (stream List.getItem cs)
end`

    API.lex(testcase);
});

it("strings", () => {
    let testcase: string = ` "bla bla\\   \\ blub" "" "\\\\ \\" "`;
    expect(API.lex(testcase)).toEqual([
        new API.StringConstantToken('"bla bla\\   \\ blub"', 1, 'bla bla blub'),
        new API.StringConstantToken('""', 21, ''),
        new API.StringConstantToken('"\\\\ \\" "', 24, '\\ \" ')
    ]);
});

it("char with multiple characters", () => {
    let testcase: string = ` #"test" "`;
    expect(() => { API.lex(testcase); }).toThrow(API.LexerError);
});

it("floating point numbers", () => {
    let testcase: string = '1e2 1e 2'

    expect(API.lex(testcase)).toEqual([
        new API.RealConstantToken("1e2", 0, 100),
        new API.NumericToken("1", 4, 1),
        new API.AlphanumericIdentifierToken("e", 5),
        new API.NumericToken("2", 7, 2)
    ])
});

it("dots", () => {
    let testcase1: string = '.';
    let testcase2: string = '..';
    let testcase3: string = '...';

    expect(() => { API.lex(testcase1); }).toThrow(API.LexerError);
    expect(() => { API.lex(testcase2); }).toThrow(API.LexerError);

    expect(API.lex(testcase3)).toEqual([
        new API.KeywordToken("...")
    ]);
});

it("reserved words", () => {
    let testcase: string = 'abstype and andalso as case datatype do else end exception fn fun handle if in infix infixr let local nonfix of op open orelse raise rec then type val with withtype while ( ) [ ] { } , : ; ... _ | = => -> #';

    expect(API.lex(testcase)).toEqual([
        new API.KeywordToken("abstype"),
        new API.KeywordToken("and"),
        new API.KeywordToken("andalso"),
        new API.KeywordToken("as"),
        new API.KeywordToken("case"),
        new API.KeywordToken("datatype"),
        new API.KeywordToken("do"),
        new API.KeywordToken("else"),
        new API.KeywordToken("end"),
        new API.KeywordToken("exception"),
        new API.KeywordToken("fn"),
        new API.KeywordToken("fun"),
        new API.KeywordToken("handle"),
        new API.KeywordToken("if"),
        new API.KeywordToken("in"),
        new API.KeywordToken("infix"),
        new API.KeywordToken("infixr"),
        new API.KeywordToken("let"),
        new API.KeywordToken("local"),
        new API.KeywordToken("nonfix"),
        new API.KeywordToken("of"),
        new API.KeywordToken("op"),
        new API.KeywordToken("open"),
        new API.KeywordToken("orelse"),
        new API.KeywordToken("raise"),
        new API.KeywordToken("rec"),
        new API.KeywordToken("then"),
        new API.KeywordToken("type"),
        new API.KeywordToken("val"),
        new API.KeywordToken("with"),
        new API.KeywordToken("withtype"),
        new API.KeywordToken("while"),
        new API.KeywordToken("("),
        new API.KeywordToken(")"),
        new API.KeywordToken("["),
        new API.KeywordToken("]"),
        new API.KeywordToken("{"),
        new API.KeywordToken("}"),
        new API.KeywordToken(","),
        new API.KeywordToken(":"),
        new API.KeywordToken(";"),
        new API.KeywordToken("..."),
        new API.KeywordToken("_"),
        new API.KeywordToken("|"),
        new API.EqualsToken(),
        new API.KeywordToken("=>"),
        new API.KeywordToken("->"),
        new API.KeywordToken("#")
    ])
});

it("integer constants decimal", () => {
    let testcase_nonint: string = '~';
    let testcase_pos: string = '42';
    let testcase_neg: string = '~69';
    let testcase_pos_leadingzero: string = '0000042';
    let testcase_neg_leadingzero: string = '~0000023';
    let testcase_bigzero: string = '000000';

    expect(API.lex(testcase_nonint)).toEqual([
        new API.IdentifierToken("~")
    ]);
    expect(API.lex(testcase_pos)).toEqual([
        new API.NumericToken(testcase_pos, 42)
    ]);
    expect(API.lex(testcase_neg)).toEqual([
        new API.IntegerConstantToken(testcase_neg, -69)
    ]);
    expect(API.lex(testcase_pos_leadingzero)).toEqual([
        new API.IntegerConstantToken(testcase_pos_leadingzero, 42)
    ]);
    expect(API.lex(testcase_neg_leadingzero)).toEqual([
        new API.IntegerConstantToken(testcase_neg_leadingzero, -23)
    ]);
    expect(API.lex(testcase_bigzero)).toEqual([
        new API.IntegerConstantToken(testcase_bigzero, 0)
    ]);
});

it("integer constants hexadecimal wellformed", () => {
    let testcase_pos: string = '0x4a';
    let testcase_neg: string = '~0x6E';
    let testcase_pos_leadingzero: string = '0x000004F';
    let testcase_neg_leadingzero: string = '~0x00a';
    let testcase_bigzero: string = '0x00000';
    let testcase_all_chars1: string = '0x0123456789';
    let testcase_all_chars2: string = '0xabcdef';
    let testcase_all_chars3: string = '0xABCDEF';

    expect(API.lex(testcase_pos)).toEqual([
        new API.NumericToken(testcase_pos, 0x4a)
    ]);
    expect(API.lex(testcase_neg)).toEqual([
        new API.IntegerConstantToken(testcase_neg, -0x6e)
    ]);
    expect(API.lex(testcase_pos_leadingzero)).toEqual([
        new API.IntegerConstantToken(testcase_pos_leadingzero, 0x4f)
    ]);
    expect(API.lex(testcase_neg_leadingzero)).toEqual([
        new API.IntegerConstantToken(testcase_neg_leadingzero, -0xa)
    ]);
    expect(API.lex(testcase_bigzero)).toEqual([
        new API.IntegerConstantToken(testcase_bigzero, 0)
    ]);
    expect(API.lex(testcase_all_chars1)).toEqual([
        new API.IntegerConstantToken(testcase_all_chars1, 0x123456789)
    ]);
    expect(API.lex(testcase_all_chars2)).toEqual([
        new API.IntegerConstantToken(testcase_all_chars2, 0xabcdef)
    ]);
    expect(API.lex(testcase_all_chars3)).toEqual([
        new API.IntegerConstantToken(testcase_all_chars3, 0xabcdef)
    ]);
});

it("integer constants hexadecimal illformed", () => {
    let testcase_nonint: string = '~0x';
    let testcase_too_long_prefix: string = '00x42';
    let testcase_too_short_prefix: string = 'x42';
    let testcase_neg_too_long_prefix: string = '~00x69';
    let testcase_neg_too_short_prefix: string = '~x42';
    let testcase_not_hex: string = '0xabcgcba';
    let testcase_missing_x: string = '04a';
    let testcase_capital_x: string = '0X4a';

    expect(API.lex(testcase_nonint)).toEqual([
        new API.IntegerConstantToken("~0", -0),
        new API.IdentifierToken("x")
    ]);
    expect(API.lex(testcase_too_long_prefix)).toEqual([
        new API.IntegerConstantToken("00", 0),
        new API.IdentifierToken("x42")
    ]);
    expect(API.lex(testcase_too_short_prefix)).toEqual([
        new API.IdentifierToken("x42")
    ]);
    expect(API.lex(testcase_neg_too_long_prefix)).toEqual([
        new API.IntegerConstantToken("~00", -0),
        new API.IdentifierToken("x69")
    ]);
    expect(API.lex(testcase_neg_too_short_prefix)).toEqual([
        new API.IdentifierToken("~"),
        new API.IdentifierToken("x42")
    ]);
    expect(API.lex(testcase_not_hex)).toEqual([
        new API.IntegerConstantToken("0xabc", 0xabc),
        new API.IdentifierToken("gcba")
    ]);
    expect(API.lex(testcase_missing_x)).toEqual([
        new API.IntegerConstantToken("04", 4),
        new API.IdentifierToken("a")
    ]);
    expect(API.lex(testcase_capital_x)).toEqual([
        new API.IntegerConstantToken("0", 0),
        new API.IdentifierToken("X4a")
    ]);
});

it("word constants decimal", () => {
    let testcase_noword: string = '0w';
    let testcase_pos: string = '0w42';
    let testcase_nohex: string = '0w9a';
    let testcase_capital_w: string = '0W1337';
    let testcase_zero_after_w: string = '0w01337';
    let testcase_leading_zero: string = '00w01';
    let testcase_neg: string = '~0w69';

    expect(API.lex(testcase_noword)).toEqual([
        new API.IntegerConstantToken("0", 0),
        new API.IdentifierToken("w")
    ]);
    expect(API.lex(testcase_pos)).toEqual([
        new API.WordConstantToken("0w42", 42)
    ]);
    expect(API.lex(testcase_nohex)).toEqual([
        new API.IntegerConstantToken("0", 0),
        new API.IdentifierToken("w9a")
    ]);
    expect(API.lex(testcase_capital_w)).toEqual([
        new API.IntegerConstantToken("0", 0),
        new API.IdentifierToken("W1337")
    ]);
    expect(API.lex(testcase_zero_after_w)).toEqual([
        new API.WordConstantToken("0w01337", 1337)
    ]);
    expect(API.lex(testcase_leading_zero)).toEqual([
        new API.IntegerConstantToken("00", 0),
        new API.IdentifierToken("w01")
    ]);
    expect(API.lex(testcase_leading_zero)).toEqual([
        new API.IntegerConstantToken("~0", -0),
        new API.IdentifierToken("w69")
    ]);
});
