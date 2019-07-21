import {Component, Input, OnInit} from '@angular/core';
import {DataSet} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-timetable-menu',
  templateUrl: './timetable-menu.component.html',
  styleUrls: ['./timetable-menu.component.css']
})
export class TimetableMenuComponent implements OnInit {
  @Input('oudData') public oudData: DataSet;
  @Input('diaIndex') public diagramIndex: number;
  @Input('direction') public direction: number;

  constructor() { }

  ngOnInit() {
  }
  getTimeTableName(){
    if(this.direction==0){
      return "下り時刻表";
    }else{
      return "上り時刻表";

    }
  }

}
