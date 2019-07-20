import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {DataSet, Station} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-station',
  templateUrl: './station.component.html',
  styleUrls: ['./station.component.css']
})
export class StationComponent implements OnInit {
  @Input('station') station: Station;
  @Input('direct') direction: number;

  constructor() {
  }

  ngOnInit() {
  }
  height(): string {
      if(this.station.timeType===0){
        return '1.2em';
      }
      if(this.station.timeType===10){
        return '2.62em';
      }
      if(this.station.timeType===20){
        return '1.2em';
      }
      if(this.station.timeType===30){
        return '1.2em';
      }
  }
  public getStationName(){
      if(this.station.name.length<6){
          return this.station.name;
      }else{
          return this.station.name.substr(0,5);
      }
  }


}
