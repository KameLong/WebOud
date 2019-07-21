import {Component, Inject, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-sample-a',
  templateUrl: './sample-a.component.html',
  styleUrls: ['./sample-a.component.css']
})
export class SampleAComponent implements OnInit {
  @Input() title: string;
  constructor(@Inject("TITLE") private titleInjected: string) {
    this.title=titleInjected;
  }

  ngOnInit() {
  }

}
