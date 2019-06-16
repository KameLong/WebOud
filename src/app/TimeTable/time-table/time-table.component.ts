import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {DataSet, Streak} from '../../OuDiaData/OudOperator';
import {Subscription} from 'rxjs';
import {ScrollService} from '../scroll.service';
import {SelectorService} from '../../selector.service';

@Component({
  selector: 'app-time-table',
  templateUrl: './time-table.component.html',
  styleUrls: ['./time-table.component.css']
})
export class TimeTableComponent implements OnInit,OnDestroy {
  @Input('oud') oudData: DataSet;
  diagramIndex=0;
  direct=0;

  private subscription: Subscription;
  constructor(private selectorService: SelectorService) {

  }

  ngOnInit() {
    // イベント登録
    // サービスで共有しているデータが更新されたら発火されるイベントをキャッチする
    this.subscription = this.selectorService.sharedDataSource$.subscribe(
      msg => {
        if(msg[0]===0){
        this.diagramIndex=msg[1];
        this.direct=msg[2];
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }


}
