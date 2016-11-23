/// <reference path="syntaxdef.ts" />

module ParserGenerator{
	export class TerminalSymbolDiscriminator{
		private terminal_symbols: Array<string>;
		private nonterminal_symbols: Array<string>;
		constructor(lexdef:Lexer.LexDefinitions, syntaxdef:SyntaxDefinitions){
			var symbol_table:Array<{symbol:string, is_terminal:boolean}> = [];
			// 字句規則からの登録
			for(var i=0; i<lexdef.length; i++){
				if(lexdef[i].type == null){
					continue;
				}
				// 重複がなければ登録する
				var flg_push = true;
				for(var ii=0; ii<symbol_table.length; ii++){
					if(symbol_table[ii].symbol == lexdef[i].type){
						flg_push = false;
						break;
					}
				}
				if(flg_push){
					// 終端記号として登録
					symbol_table.push({symbol: lexdef[i].type, is_terminal: true});
				}
			}
			// 構文規則からの登録(左辺値のみ)
			for(var i=0; i<syntaxdef.length; i++){
				var flg_token_not_found = true;
				// 重複がなければ登録する
				for(var ii=0; ii<symbol_table.length; ii++){
					if(syntaxdef[i].ltoken == symbol_table[ii].symbol){
						// もし既に登録されていた場合、終端記号ではないとする
						symbol_table[ii].is_terminal = false;
						flg_token_not_found = false;
						break;
					}
				}
				if(flg_token_not_found){
					// 構文規則の左辺に現れる記号は非終端記号
					symbol_table.push({symbol : syntaxdef[i].ltoken, is_terminal : false});
				}
			}
			this.terminal_symbols = [];
			this.nonterminal_symbols = [];
			for(var i=0; i<symbol_table.length; i++){
				if(symbol_table[i].is_terminal){
					this.terminal_symbols.push(symbol_table[i].symbol);
				}
				else{
					this.nonterminal_symbols.push(symbol_table[i].symbol);
				}
			}
		}
		getTerminalSymbols():Array<string>{
			return this.terminal_symbols.slice();
		}
		getNonterminalSymbols():Array<string>{
			return this.nonterminal_symbols.slice();
		}
		getAllSymbols():Array<string>{
			return this.terminal_symbols.concat(this.nonterminal_symbols);
		}
		// その都度生成するから呼び出し先で保持して
		// true: terminal, false: nonterminal
		getAllSymbolsMap():{[key:string]:boolean}{
			var result = {};
			for(var i=0; i<this.terminal_symbols.length; i++){
				result[this.terminal_symbols[i]] = true;
			}
			for(var i=0; i<this.nonterminal_symbols.length; i++){
				result[this.nonterminal_symbols[i]] = false;
			}
			return result;
		}
		isTerminalSymbol(symbol:string):boolean{
			for(var i=0; i<this.terminal_symbols.length; i++){
				if(this.terminal_symbols[i] == symbol) return true;
			}
			return false;
		}
		isNonterminalSymbol(symbol:string):boolean{
			for(var i=0; i<this.nonterminal_symbols.length; i++){
				if(this.nonterminal_symbols[i] == symbol) return true;
			}
			return false;
		}
	}
}