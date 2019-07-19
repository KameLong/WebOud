import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {Point} from '../OuDiaData/tool';
@Injectable({
  providedIn: 'root'
})
export class ScrollService {
  private sharedDataSource = new Subject<Point>();
  public sharedDataSource$ = this.sharedDataSource.asObservable();

  constructor() { }
  public onNotifySharedDataChanged(scrollX: number,scrollY: number) {
    this.sharedDataSource.next(new Point(scrollX,scrollY));
  }
}
