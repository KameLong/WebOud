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
    let result=this.train.operationNum;
    if(result.length==0){
      return '　';
    }
    return result;
  }
  typeName() {
    let result=this.oudData.trainTypes[this.train.typeIdx].shortname;
    if(result.length==0){
      return '　';
    }
    return result;
  }
  trainName(){
    let result= this.train.name;
    if(result.length<3){
      return result+'　　　';
    }
    return result;
  }
  visibleCount(){
    return (this.train.no!==undefined &&this.train.no.length>0);

  }
  count(){
    return this.train.no;
  }


}
