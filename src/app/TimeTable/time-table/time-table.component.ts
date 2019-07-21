import {Component, Inject, Input, OnDestroy, OnInit} from '@angular/core';
import {DataSet, Station, Streak} from '../../OuDiaData/OudOperator';
import {Subscription} from 'rxjs';
import {ScrollService} from '../scroll.service';
import {SelectorService} from '../../selector.service';

@Component({
  selector: 'app-time-table',
  templateUrl: './time-table.component.html',
  styleUrls: ['./time-table.component.css']
})
export class TimeTableComponent implements OnInit,OnDestroy {
  @Input('oudData') public oudData: DataSet;
  @Input('diaIndex') public diagramIndex: number;
  @Input('direction') public direction: number;


  constructor(private selectorService:SelectorService
    ) {

  }

  ngOnInit() {
    this.selectorService.sharedDataSource$.subscribe((list:Array<number>)=>{
      this.diagramIndex=list[1];
      this.direction=list[2];

    });


  }

  ngOnDestroy(): void {
  }
  useTimeTable(): Array<Streak> {
    if(this.oudData.diagrams.length>this.diagramIndex) {
      if(this.direction===0) {
        return this.oudData.diagrams[this.diagramIndex].downStreaks;
      } else {
        return this.oudData.diagrams[this.diagramIndex].upStreaks;

      }
    } else {
      return new Array<Streak>();
    }
  }
  onScroll(event: Event) {
    const trainList =document.getElementById('trainList');
    const trainTitle =document.getElementById('trainTitle');
    const stationList =document.getElementById('stationList');
    trainTitle.scrollTo(trainList.scrollLeft,0);
    stationList.scrollTo(0,trainList.scrollTop);
  }
  stationList(): Array<Station> {
    if(this.direction===0) {
      return this.oudData.stations;
    } else {
      return this.oudData.stations.reverse() as Array<Station>;
    }
  }

}
