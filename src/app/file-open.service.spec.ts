import { TestBed } from '@angular/core/testing';

import { FileOpenService } from './file-open.service';

describe('FileOpenService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FileOpenService = TestBed.get(FileOpenService);
    expect(service).toBeTruthy();
  });
});
