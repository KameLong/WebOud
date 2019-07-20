import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';
import {Point} from './OuDiaData/tool';
import {DataSet} from './OuDiaData/OudOperator';

@Injectable({
  providedIn: 'root'
})
export class SelectorService {
  private sharedDataSource = new Subject<Array<number>>();
  public sharedDataSource$ = this.sharedDataSource.asObservable();

  constructor() { }
  public onNotifySharedDataChanged(style:number,dia:number,direct:number) {
    this.sharedDataSource.next(new Array(style,dia,direct));
  }

}
