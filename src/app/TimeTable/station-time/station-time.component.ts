import {Component, Input, OnInit} from '@angular/core';
import {DataSet, StHandling} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-station-time',
  templateUrl: './station-time.component.html',
  styleUrls: ['./station-time.component.css']
})
export class StationTimeComponent implements OnInit {

  @Input('st') time: StHandling;
  constructor() { }

  ngOnInit() {
  }
  depTimeFormat(): string{
    switch (this.time.type) {
      case 0:
        return '::';

        break;
      case 1:
        if(this.time.departure.isNull) {
          if(this.time.arrival.isNull) {
            return '○';
          } else {
            return this.time.arrival.h+this.time.arrival.m;
          }
        } else {
          return this.time.departure.h+this.time.departure.m;
        }
      case 2:
        return 'ﾚ';
      case 3:
        return '||';
    }
  }


}
