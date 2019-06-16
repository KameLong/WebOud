import {Component, Input, OnInit} from '@angular/core';
import {DataSet} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-time-table',
  templateUrl: './time-table.component.html',
  styleUrls: ['./time-table.component.css']
})
export class TimeTableComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  constructor() { }

  ngOnInit() {

  }

}
