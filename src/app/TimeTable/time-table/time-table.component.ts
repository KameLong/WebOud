import {AfterContentInit, AfterViewChecked, ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit} from '@angular/core';
import {DataSet, Station, Streak} from '../../OuDiaData/OudOperator';
import {Subscription} from 'rxjs';
import {ScrollService} from '../scroll.service';
import {SelectorService} from '../../selector.service';

@Component({
  selector: 'app-time-table',
  templateUrl: './time-table.component.html',
  styleUrls: ['./time-table.component.css']
})
export class TimeTableComponent implements OnInit,OnDestroy,AfterViewChecked,AfterContentInit{
  @Input('oudData') public oudData: DataSet;
  @Input('diaIndex') public diagramIndex: number;
  @Input('direction') public direction: number;


  constructor(private selectorService: SelectorService,
              private cd: ChangeDetectorRef,
    ) {

  }

  ngOnInit() {
    this.selectorService.sharedDataSource$.subscribe((list: Array<number>)=>{
      this.diagramIndex=list[1];
      this.direction=list[2];

    });



  }
  ngAfterContentInit(){

  }

  ngAfterViewChecked(): void {
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
  stationIndexList(): Array<number> {

    const result=new Array<number>();

    for(let i=0;i<this.oudData.stations.length;i++){
      if(this.direction===0){
        result.push(i);
      }else{
        result.push(this.oudData.stations.length-i-1);
      }
    }
    return result;
  }

}
