import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileOpenService {
  private sharedDataSource = new Subject<string[]>();
  public sharedDataSource$ = this.sharedDataSource.asObservable();

  constructor() { }
  public onNotifySharedDataChanged(s:string[]) {
    this.sharedDataSource.next(s);
  }
}
