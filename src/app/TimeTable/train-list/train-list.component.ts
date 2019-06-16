import {Component, Input, OnInit} from '@angular/core';
import {DataSet} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-train-list',
  templateUrl: './train-list.component.html',
  styleUrls: ['./train-list.component.css']
})
export class TrainListComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  constructor() { }

  ngOnInit() {
  }

}
