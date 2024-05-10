import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import pick from 'lodash.pick';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly s3Client = new S3Client({
    region: this.configService.getOrThrow('AWS_REGION'),
  } as any);

  constructor(private configService: ConfigService) {}

  async upload(file: Express.Multer.File) {
    try {
      const filename = nanoid() + '_' + file.originalname;
      const result = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.configService.getOrThrow('AWS_S3'),
          Key: filename,
          Body: file.buffer,
        }) as any,
      );
      if (result) {
        return {
          name: filename,
          ...pick(file, ['mimetype', 'size']), // TODO: should pick from file ?
        };
      }
    } catch (error) {
      console.log('FilesService upload error', error);
    }
  }

  async generatePublicUrl(filename: string) {
    const command = new GetObjectCommand({
      Bucket: this.configService.getOrThrow('AWS_S3'),
      Key: filename,
    });
    return await getSignedUrl(this.s3Client, command, {
      expiresIn: 30 * 60, // seconds
    });
  }
}
