import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {DataSet, Streak} from '../../OuDiaData/OudOperator';
import {ScrollService} from '../scroll.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-train-title',
  templateUrl: './train-title.component.html',
  styleUrls: ['./train-title.component.css']
})
export class TrainTitleComponent implements OnInit ,OnDestroy{
  @Input('oud') oudData: DataSet=new DataSet();
  @Input('diagramIndex') diagramIndex: number;
  @Input('direction') direction: number;

  private subscription: Subscription;
  constructor(private scrollService: ScrollService) {

  }

  ngOnInit() {
    // イベント登録
    // サービスで共有しているデータが更新されたら発火されるイベントをキャッチする
    this.subscription = this.scrollService.sharedDataSource$.subscribe(
      msg => {
        let a=document.getElementById('trainTitle');
        a.scrollTo(msg.x,0);
      }
    );
  }
  useTimeTable(): Array<Streak> {
    if(this.oudData.diagrams.length>this.diagramIndex) {
      if(this.direction===0){
        return this.oudData.diagrams[this.diagramIndex].downStreaks;
      }else{
        return this.oudData.diagrams[this.diagramIndex].upStreaks;

      }
    } else {
      return new Array<Streak>();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
