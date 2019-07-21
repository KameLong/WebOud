import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {DataSet, Station} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-station',
  templateUrl: './station.component.html',
  styleUrls: ['./station.component.css']
})
export class StationComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  @Input('stationIndex') stationIndex: number;
  @Input('direct') direction: number;

  constructor() {
  }

  ngOnInit() {
  }
  height(): string {
      const station=this.oudData.stations[this.stationIndex];
      if(station.timeType===0){
        return '1.2em';
      }
      if(station.timeType===10){
        return '2.62em';
      }
      if(station.timeType===20){
        return '1.2em';
      }
      if(station.timeType===30){
        return '1.2em';
      }
  }
  public getStationName(){
      const station=this.oudData.stations[this.stationIndex];
      if(station.name.length<6){
          return station.name;
      }else{
          return station.name.substr(0,5);
      }
  }
  public border(){
      if(this.direction==0){
          return this.oudData.stations[this.stationIndex].boundary;
      }else if(this.stationIndex!=this.oudData.stations.length-1){
          return this.oudData.stations[this.stationIndex+1].boundary;
      }
      return false;
  }



}
