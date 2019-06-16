import {Component, OnDestroy, OnInit} from '@angular/core';
import {DataSet} from './OuDiaData/OudOperator';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {SelectorService} from './selector.service';
import {Subscription} from 'rxjs';
import {FileOpenService} from './file-open.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit,OnDestroy{
  private queryParams: any;
  private oudURL: string=null;
  private oud2URL: string=null;

  title = 'WebOud';
  oudiaData: DataSet=new DataSet();
  private subscription: Subscription;


  constructor(private http: HttpClient,    private _activatedRoute: ActivatedRoute,
              private _router: Router,private fileOpenService: FileOpenService) {
    this.oudiaData=new DataSet();


    this._activatedRoute.queryParams.subscribe(
      params => {
        console.log(params);
        this.queryParams = params;
        this.oudURL = this.queryParams.oudURL;
        this.oud2URL = this.queryParams.oud2URL;
        if(this.oudURL!=null){
          this.http.get(this.oudURL, {
            responseType: 'blob',
          })
            .subscribe(
              data => {
                const reader = new FileReader();
                reader.onload = (event) => {
                  this.oudiaData.fromOud2((reader.result as string).split('\r\n'));
                  this.startInit();
                }
                reader.readAsText(data,'Shift_JIS');

              },
              error => {
                console.log('通信に失敗しました。');
              }
            );
          return;
        }
      }
    );

  }
  ngOnInit(): void {
    if(this.oudURL!=null){
      this.http.get(this.oudURL, {
        responseType: 'blob',
      })
        .subscribe(
          data => {
            const reader = new FileReader();
            reader.onload = (event) => {
              this.oudiaData=new DataSet();
              this.oudiaData.fromOud2((reader.result as string).split('\r\n'));
              this.startInit();
            }
            reader.readAsText(data,'Shift_JIS');

          },
          error => {
            console.log('通信に失敗しました。');
          }
        );
      return;
    }
    if(this.oud2URL!=null){
      this.http.get(this.oud2URL, {
        responseType: 'blob',
      })
        .subscribe(
          data => {
            const reader = new FileReader();
            reader.onload = (event) => {
              this.oudiaData=new DataSet();
              this.oudiaData.fromOud2((reader.result as string).split('\r\n'));
              this.startInit();
            }
            reader.readAsText(data,);

          },
          error => {
            console.log('通信に失敗しました。');
          }
        );
      return;
    }

    this.http.get('/assets/sample.oud', {
      responseType: 'blob',
    })
      .subscribe(
        data => {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.oudiaData=new DataSet();
            this.oudiaData.fromOud2((reader.result as string).split('\r\n'));
            this.startInit();
          }
          reader.readAsText(data,'Shift_JIS');

        },
        error => {
          console.log('通信に失敗しました。');
        }
      );
    // イベント登録
    // サービスで共有しているデータが更新されたら発火されるイベントをキャッチする
    this.subscription = this.fileOpenService.sharedDataSource$.subscribe(
      msg => {
        this.oudiaData=new DataSet();
        this.oudiaData.fromOud2(msg);
      }
    );

  }

  startInit(): string {
    console.log('読み込みました');

    return ' ';
  }
  loadOud(url: string ,shiftJIS: boolean) {
    this.http.get(url, {
      responseType: 'blob',
    })
      .subscribe(
        data => {
          const reader = new FileReader();
          reader.onload = (event) => {
            this.oudiaData.fromOud2((reader.result as string).split('\r\n'));
            this.startInit();
          }
          if(shiftJIS) {
            reader.readAsText(data, 'Shift_JIS');
          }else{
            reader.readAsText(data);
          }

        },
        error => {
          console.log('通信に失敗しました。');
        }
      );

  }
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }




}
