import {DataSet} from './OudOperator';
import {Injector, ReflectiveInjector} from '@angular/core';

export class Point {
  x=0;
  y=0;
  constructor(x:number, y:number) {
    this.x = x;
    this.y = y;
  }
}
export class TabModel {
  public name: string;
  public compoment: any;
  public oudiaFile: DataSet;
  public diaIndex: number;
  public direct: number;
  public current=false;

  /**
   * コンストラクタ
   */
  constructor(name: string,componentName: any,oudiaFile: DataSet, diaIndex: number,direct: number) {
    this.name=name;
    this.compoment=componentName;
    this.oudiaFile=oudiaFile;
    this.diaIndex=diaIndex;
    this.direct=direct;
  }
  public getInjector(injector: Injector): Injector {
     return ReflectiveInjector.resolveAndCreate([
       { provide: 'oudData', useValue: this.oudiaFile},
       { provide: 'diaIndex', useValue: this.diaIndex},
       { provide: 'direction', useValue: this.direct}
       ], injector);
  }


}
