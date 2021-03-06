import {Token, SYMBOL_SYNTAX, SYMBOL_EOF} from "../def/token";
import {SyntaxDefinitions, GrammarDefinition} from "../def/grammar";
import {SymbolDiscriminator} from "./symboldiscriminator";
import {SyntaxDB} from "./syntaxdb";

export class ClosureItem{
	// インスタンス生成後に内部状態が変化することはないものとする
	private _lr0_hash: string;
	private _lr1_hash: string;
	constructor(private syntax:SyntaxDB, private _syntax_id:number, private _dot_index:number, private _lookaheads:Array<Token>){
		this.sortLA();
		this.updateHash();
	}
	get syntax_id():number{
		return this._syntax_id;
	}
	get dot_index():number{
		return this._dot_index;
	}
	get lookaheads():Array<Token>{
		return this._lookaheads;
	}
	private sortLA(){
		this.lookaheads.sort((t1:Token, t2:Token)=>{
			return this.syntax.getTokenId(t1) - this.syntax.getTokenId(t2);
		});
	}
	// ハッシュ文字列を生成する
	private updateHash(){
		this._lr0_hash = this.syntax_id.toString() + "," + this.dot_index.toString();
		let la_hash = "[";
		for(let i=0; i<this.lookaheads.length; i++){
			la_hash += this.syntax.getTokenId(this.lookaheads[i]).toString();
			if(i != this.lookaheads.length-1) la_hash += ",";
		}
		la_hash += "]";
		this._lr1_hash = this._lr0_hash + "," + la_hash;
	}
	// 先読み部分を除いたハッシュ文字列を取得
	public getLR0Hash(): string{
		return this._lr0_hash;
	}
	// 先読み部分を含めたハッシュ文字列を取得
	public getLR1Hash(): string{
		return this._lr1_hash;
	}
	// 先読み部分を除いた部分が一致しているか調べる
	public isSameLR0(c:ClosureItem): boolean{
		return this.getLR0Hash() == c.getLR0Hash();
	}
	// 先読み部分も含めて完全に一致しているか調べる
	public isSameLR1(c:ClosureItem): boolean{
		return this.getLR1Hash() == c.getLR1Hash();
	}
	// LR0部分の同じ2つのClosureItemの先読み部分を統合して新しいClosureItemを生成する
	public merge(c:ClosureItem): ClosureItem|null{
		// LR0部分が違っている場合はnullを返す
		if(!this.isSameLR0(c)) return null;
		// LR1部分まで同じ場合は自身を返す
		if(this.isSameLR1(c)) return this;
		// 双方のlookaheads配列はソート済みであるとする
		let i1=0;
		let i2=0;
		let new_la = [];
		// 2つのLA配列をマージして新しい配列を生成する
		while(i1 < this.lookaheads.length || i2 < c.lookaheads.length){
			if(i1 == this.lookaheads.length){
				new_la.push(c.lookaheads[i2++]);
			}
			else if(i2 == c.lookaheads.length){
				new_la.push(this.lookaheads[i1++]);
			}
			else if(this.lookaheads[i1] == c.lookaheads[i2]){
				new_la.push(this.lookaheads[i1++]);
				i2++;
			}
			else if(this.syntax.getTokenId(this.lookaheads[i1]) < this.syntax.getTokenId(c.lookaheads[i2])){
				new_la.push(this.lookaheads[i1++]);
			}
			else {
				new_la.push(c.lookaheads[i2++]);
			}
		}
		return new ClosureItem(this.syntax, this.syntax_id, this.dot_index, new_la);
	}
}

export class ClosureSet{
	// インスタンス生成後に内部状態が変化することはないものとする
	private _lr0_hash: string;
	private _lr1_hash: string;
	constructor(private syntax:SyntaxDB, private closureset:Array<ClosureItem>){
		this.expandClosure();
		this.sort();
		this.updateHash();
	}
	// 必ずソートされた状態に保たれているようにする
	private sort(){
		this.closureset.sort((i1:ClosureItem, i2:ClosureItem)=>{
			if(i1.getLR1Hash() < i2.getLR1Hash()) return -1;
			else if(i1.getLR1Hash() > i2.getLR1Hash()) return 1;
			return 0;
		});
	}
	get size(){
		return this.closureset.length;
	}
	public getArray(){
		return this.closureset;
	}
	// アイテムが含まれているかどうかを調べる
	public includes(item: ClosureItem):boolean{
		for(let i of this.closureset){
			if(i.isSameLR1(item)) return true;
		}
		return false;
	}
	// 先読み部分を除いた部分が一致しているか調べる
	public isSameLR0(c:ClosureSet): boolean{
		return this.getLR0Hash() == c.getLR0Hash();
	}
	// 先読み部分も含めて完全に一致しているか調べる
	public isSameLR1(c:ClosureSet): boolean{
		return this.getLR1Hash() == c.getLR1Hash();
	}
	// ハッシュ文字列を生成する
	private updateHash(){
		let lr0_hash = "";
		let lr1_hash = "";
		for(let i=0; i<this.closureset.length; i++){
			lr0_hash += this.closureset[i].getLR0Hash();
			lr1_hash += this.closureset[i].getLR1Hash();
			if(i != this.closureset.length-1) {
				lr0_hash += "|";
				lr1_hash += "|";
			}
		}
		this._lr0_hash = lr0_hash;
		this._lr1_hash = lr1_hash;
	}
	public getLR0Hash(){
		return this._lr0_hash;
	}
	public getLR1Hash(){
		return this._lr1_hash;
	}
	// 先読み部分を除いて一致している2つのClosureSetの先読み部分を統合して新しいClosureSetを生成する
	public mergeLA(cs: ClosureSet): ClosureSet|null{
		// LR0部分が違っている場合はnullを返す
		if(!this.isSameLR0(cs)) return null;
		// LR1部分まで同じ場合は自身を返す
		if(this.isSameLR1(cs)) return this;
		let a1 = this.getArray();
		let a2 = cs.getArray();
		let new_set:Array<ClosureItem> = [];
		// 2つの配列においてLR部分は順序を含めて等しい
		for(let i=0; i<a1.length; i++){
			let new_item = a1[i].merge(a2[i]);
			if(new_item != null) new_set.push(new_item);
		}
		return new ClosureSet(this.syntax, new_set);
	}

	// クロージャー展開を行う
	// TODO: リファクタリング
	private expandClosure(){
		// 展開処理中はClosureItemのlookaheadsの要素数を常に1に保つこととする
		// 初期化
		let set:Array<ClosureItem> = [];
		// ClosureItemをlookaheadsごとに分解する
		for(let ci of this.closureset){
			for(let la of ci.lookaheads){
				set.push(new ClosureItem(this.syntax, ci.syntax_id, ci.dot_index, [la]));
			}
		}
		this.closureset = set;
		this.sort();

		// 変更がなくなるまで繰り返す
		let i=0;
		while(i<this.closureset.length){
			let ci = this.closureset[i++];
			let {ltoken, pattern} = this.syntax.get(ci.syntax_id);

			if(ci.dot_index == pattern.length) continue; // .が末尾にある場合はスキップ
			let follow = pattern[ci.dot_index];
			if(!this.syntax.symbols.isNonterminalSymbol(follow)) continue; // .の次の記号が非終端記号でないならばスキップ

			// クロージャー展開を行う

			// 先読み記号を導出
			// ci.lookaheadsは要素数1のため、0番目のインデックスのみを参照すればよい
			let lookaheads = [...this.syntax.first.get(pattern.slice(ci.dot_index+1).concat(ci.lookaheads[0])).values()];
			lookaheads.sort((t1:Token, t2:Token)=>{
				return this.syntax.getTokenId(t1) - this.syntax.getTokenId(t2);
			});

			// symbolを左辺にもつ全ての規則を、先読み記号を付与して追加
			let definitions = this.syntax.findDef(follow);
			for(let {id, def} of definitions){
				for(let la of lookaheads){
					let new_ci = new ClosureItem(this.syntax, id, 0, [la]);
					// 重複がなければ新しいアイテムを追加する
					let flg_duplicated = false;
					for(let existing_item of this.closureset){
						if(new_ci.isSameLR1(existing_item)){
							flg_duplicated = true;
							break;
						}
					}
					if(!flg_duplicated){
						this.closureset.push(new_ci);
					}
				}
			}
		}
		this.sort();

		// ClosureItemの先読み部分をマージする
		let tmp = this.closureset;
		this.closureset = [];
		let lookaheads = [];
		for(let i=0; i<tmp.length; i++){
			lookaheads.push(tmp[i].lookaheads[0]);
			if(i == tmp.length-1 || !tmp[i].isSameLR0(tmp[i+1])){
				this.closureset.push(new ClosureItem(this.syntax, tmp[i].syntax_id, tmp[i].dot_index, lookaheads));
				lookaheads = [];
			}
		}
	}
}
