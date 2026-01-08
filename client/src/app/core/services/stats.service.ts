import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  StatsOverview,
  ResolutionDistribution,
  CodecDistribution,
  ContainerDistribution,
  StorageStats
} from '@core/models';

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private readonly basePath = '/stats';

  constructor(private api: ApiService) {}

  getOverview(): Observable<StatsOverview> {
    return this.api.get<StatsOverview>(`${this.basePath}/overview`);
  }

  getResolutionDistribution(): Observable<ResolutionDistribution> {
    return this.api.get<ResolutionDistribution>(`${this.basePath}/resolution`);
  }

  getCodecDistribution(): Observable<CodecDistribution> {
    return this.api.get<CodecDistribution>(`${this.basePath}/codecs`);
  }

  getContainerDistribution(): Observable<ContainerDistribution> {
    return this.api.get<ContainerDistribution>(`${this.basePath}/containers`);
  }

  getStorageStats(): Observable<StorageStats> {
    return this.api.get<StorageStats>(`${this.basePath}/storage`);
  }
}
