import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-train-title',
  templateUrl: './train-title.component.html',
  styleUrls: ['./train-title.component.css']
})
export class TrainTitleComponent implements OnInit {
  @Input('master') masterName: string;

  constructor() { }

  ngOnInit() {
  }

}
