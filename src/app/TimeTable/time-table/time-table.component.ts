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


  constructor(
    @Inject('oudData') public oudData: DataSet,
    @Inject('diaIndex') private diagramIndex: number,
    @Inject('direction') private direction: number
    ) {

  }

  ngOnInit() {
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
