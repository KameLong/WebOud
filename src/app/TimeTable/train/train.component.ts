import {Component, Input, OnInit} from '@angular/core';
import {DataSet, StHandling, Streak} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-train',
  templateUrl: './train.component.html',
  styleUrls: ['./train.component.css']
})
export class TrainComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  @Input('train')train: Streak;
  @Input('direction')direction: number;

  constructor() { }

  ngOnInit() {
  }
  trainColor(): string {
    return this.oudData.trainTypes[this.train.typeIdx].lineColor.RGB();
  }

  depTimeFormat(stationIndex: number): string {
    if(stationIndex>=this.train.stHandlings.length) {
      this.train.stHandlings[stationIndex]=new StHandling();
    }
    const time=this.train.stHandlings[stationIndex];
    switch (time.type) {
      case 0:
        return '･ ･';
      case 1:
        if(time.departure.isNull) {
          if(this.oudData.stations[stationIndex].timeType===10) {
            if(this.train.stHandlings.length>stationIndex+1) {
              switch (this.train.stHandlings[stationIndex + 1].type) {
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
  ariTimeFormat(stationIndex: number): string {
    if(stationIndex>=this.train.stHandlings.length) {
      this.train.stHandlings[stationIndex]=new StHandling();
    }

    const time=this.train.stHandlings[stationIndex];
    switch (time.type) {
      case 0:
        return '･ ･';

        break;
      case 1:
        if(time.arrival.isNull) {
          if(this.oudData.stations[stationIndex].timeType===10) {
            if(stationIndex>0) {
              switch (this.train.stHandlings[stationIndex - 1].type) {
                case 0:
                  return '･ ･';
                case 3:
                  return '||';
                default:
                  console.log(this.train.stHandlings[stationIndex - 1].type);
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
    if(s.startsWith('0')) {
      return s.substr(1,2);
    } else {
      return s;
    }
  }
  showDep(stationIndex: number) {
      if(this.oudData.stations[stationIndex].timeType===0) {
        return true;
      }
      if(this.oudData.stations[stationIndex].timeType===10) {
        return true;
      }
      if(this.oudData.stations[stationIndex].timeType===20) {
        return false;
      }
      if(this.oudData.stations[stationIndex].timeType===30) {
        return true;
      }
  }
  showAri(stationIndex: number) {
      if(this.oudData.stations[stationIndex].timeType===0) {
        return false;
      }
      if(this.oudData.stations[stationIndex].timeType===10) {
        return true;
      }
      if(this.oudData.stations[stationIndex].timeType===20) {
        return true;
      }
      if(this.oudData.stations[stationIndex].timeType===30) {
        return false;
      }
  }
  clickTest(stationIndex: number) {
  }
  border(stationIndex: number){
    if(this.direction == 0){
      return this.oudData.stations[stationIndex].boundary;
    }else{
      if(stationIndex==this.oudData.stations.length-1){
        return false;
      }
      return this.oudData.stations[stationIndex+1].boundary;
    }
  }



}
