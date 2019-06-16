import {Component, Input, OnInit} from '@angular/core';
import {DataSet, Station, StHandling, Streak} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-station-time',
  templateUrl: './station-time.component.html',
  styleUrls: ['./station-time.component.css']
})
export class StationTimeComponent implements OnInit {

  @Input('stationIndex')stationIndex: number;
  @Input('train') train: Streak;
  @Input('station') stationList: Array<Station>;
  constructor() { }

  ngOnInit() {
  }
  depTimeFormat(): string{
    const time=this.train.stHandlings[this.stationIndex];
    switch (time.type) {
      case 0:
        return '･ ･';
      case 1:
        if(time.departure.isNull) {
          if(this.stationList[this.stationIndex].timeType===10){
            if(this.train.stHandlings.length>this.stationIndex+1) {
              switch (this.train.stHandlings[this.stationIndex + 1].type) {
                case 0:
                  return '･ ･';
                case 3:
                  return '||';
                default:
                  return '○';
              }
            }
            return '･ ･';
          }

          if(time.arrival.isNull) {
            return '○';
          } else {
            return this.showTime(time.arrival.h)+time.arrival.m;
          }
        } else {
          return this.showTime(time.departure.h)+time.departure.m;
        }
      case 2:
        return 'ﾚ';
      case 3:
        return '||';
      default:
        return '･ ･';
    }
  }
  ariTimeFormat(): string{
    const time=this.train.stHandlings[this.stationIndex];
    switch (time.type) {
      case 0:
        return '･ ･';

        break;
      case 1:
        if(time.arrival.isNull) {
          if(this.stationList[this.stationIndex].timeType===10){
            if(this.stationIndex>0) {
              switch (this.train.stHandlings[this.stationIndex - 1].type) {
                case 0:
                  return '･ ･';
                case 3:
                  return '||';
                default:
                  console.log(this.train.stHandlings[this.stationIndex - 1].type);
                  return '○';
              }
            }
            return '･ ･';
          }
          if(time.departure.isNull) {
            return '○';
          } else {
            return this.showTime(time.departure.h)+time.departure.m;
          }
        } else {
          return this.showTime(time.arrival.h)+time.arrival.m;
        }
      case 2:
        return 'ﾚ';
      case 3:
        return '||';
      default:
        return '･ ･';
    }
  }
  showTime(s: string): string {
    if(s.startsWith('0')){
      return s.substr(1,2);
    }else {
      return s;
    }
  }
  showDep() {
    const direction= 0;
    if(direction===0) {
      if(this.stationList[this.stationIndex].timeType===0){
        return true;
      }
      if(this.stationList[this.stationIndex].timeType===10){
        return true;
      }
      if(this.stationList[this.stationIndex].timeType===20){
        return false;
      }
      if(this.stationList[this.stationIndex].timeType===30){
        return true;
      }

    }
  }
  showAri() {
    const direction= 0;
    if(direction===0) {
      if(this.stationList[this.stationIndex].timeType===0){
        return false;
      }
      if(this.stationList[this.stationIndex].timeType===10){
        return true;
      }
      if(this.stationList[this.stationIndex].timeType===20){
        return true;
      }
      if(this.stationList[this.stationIndex].timeType===30){
        return false;
      }

    }
  }

}
