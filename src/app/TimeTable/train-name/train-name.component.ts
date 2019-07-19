import {Component, Input, OnInit} from '@angular/core';
import {DataSet, Streak} from '../../OuDiaData/OudOperator';

@Component({
  selector: 'app-train-name',
  templateUrl: './train-name.component.html',
  styleUrls: ['./train-name.component.css']
})
export class TrainNameComponent implements OnInit {
  @Input('oud') oudData: DataSet;
  @Input('train') train: Streak;

  constructor() { }

  ngOnInit() {
  }
  trainColor(): string {
    return this.oudData.trainTypes[this.train.typeIdx].lineColor.RGB();
  }
  trainNumber() {
    return this.train.operationNum;
  }
  typeName() {
    let result=this.oudData.trainTypes[this.train.typeIdx].shortname;
    if(result.length==0){
      return '　';
    }
    return result;
  }


}
