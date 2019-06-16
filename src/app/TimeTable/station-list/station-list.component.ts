import {Component, Input, OnInit} from '@angular/core';
import {DataSet} from '../../OuDiaData/OudOperator';
import {Station} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-station-list',
  templateUrl: './station-list.component.html',
  styleUrls: ['./station-list.component.css']
})
export class StationListComponent implements OnInit {
  @Input('oud') oudData: DataSet;

  constructor() {
  }

  ngOnInit() {
  }

}
