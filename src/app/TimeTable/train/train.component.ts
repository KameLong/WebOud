import {Component, Input, OnInit} from '@angular/core';
import {DataSet, Streak} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-train',
  templateUrl: './train.component.html',
  styleUrls: ['./train.component.css']
})
export class TrainComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  @Input('train')trainIndex: Streak;

  constructor() { }

  ngOnInit() {
  }

}
