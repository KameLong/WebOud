import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {DataSet, Streak} from '../../OuDiaData/OudOperator';
import {Station} from '../../OuDiaData/OudOperator';
import {ScrollService} from '../scroll.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-station-list',
  templateUrl: './station-list.component.html',
  styleUrls: ['./station-list.component.css']
})
export class StationListComponent implements OnInit,OnDestroy {
  @Input('oud') oudData: DataSet;
  private subscription: Subscription;

  constructor(private scrollService: ScrollService) { }

  ngOnInit() {
    // イベント登録
    // サービスで共有しているデータが更新されたら発火されるイベントをキャッチする
    this.subscription = this.scrollService.sharedDataSource$.subscribe(
      msg => {
        let a=document.getElementById('stationList');
        a.scrollTo(0,msg.y);
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
