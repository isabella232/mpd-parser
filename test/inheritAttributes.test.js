import {
  inheritAttributes,
  buildBaseUrls,
  getSegmentInformation
} from '../src/inheritAttributes';
import { stringToMpdXml } from '../src/stringToMpdXml';
import errors from '../src/errors';
import QUnit from 'qunit';
import { toPlaylists } from '../src/toPlaylists';

QUnit.module('buildBaseUrls');

QUnit.test('returns reference urls when no BaseURL nodes', function(assert) {
  const reference = ['https://example.com/', 'https://foo.com/'];

  assert.deepEqual(buildBaseUrls(reference, []), reference, 'returns reference urls');
});

QUnit.test('single reference url with single BaseURL node', function(assert) {
  const reference = ['https://example.com'];
  const node = [{ textContent: 'bar/' }];
  const expected = ['https://example.com/bar/'];

  assert.deepEqual(buildBaseUrls(reference, node), expected, 'builds base url');
});

QUnit.test('multiple reference urls with single BaseURL node', function(assert) {
  const reference = ['https://example.com/', 'https://foo.com/'];
  const node = [{ textContent: 'bar/' }];
  const expected = ['https://example.com/bar/', 'https://foo.com/bar/'];

  assert.deepEqual(buildBaseUrls(reference, node), expected,
    'base url for each reference url');
});

QUnit.test('multiple BaseURL nodes with single reference url', function(assert) {
  const reference = ['https://example.com/'];
  const nodes = [{ textContent: 'bar/' }, { textContent: 'baz/' }];
  const expected = ['https://example.com/bar/', 'https://example.com/baz/'];

  assert.deepEqual(buildBaseUrls(reference, nodes), expected, 'base url for each node');
});

QUnit.test('multiple reference urls with multiple BaseURL nodes', function(assert) {
  const reference = ['https://example.com/', 'https://foo.com/', 'http://example.com'];
  const nodes =
    [{ textContent: 'bar/' }, { textContent: 'baz/' }, { textContent: 'buzz/' }];
  const expected = [
    'https://example.com/bar/',
    'https://example.com/baz/',
    'https://example.com/buzz/',
    'https://foo.com/bar/',
    'https://foo.com/baz/',
    'https://foo.com/buzz/',
    'http://example.com/bar/',
    'http://example.com/baz/',
    'http://example.com/buzz/'
  ];

  assert.deepEqual(buildBaseUrls(reference, nodes), expected, 'creates all base urls');
});

QUnit.test('absolute BaseURL overwrites reference', function(assert) {
  const reference = ['https://example.com'];
  const node = [{ textContent: 'https://foo.com/bar/' }];
  const expected = ['https://foo.com/bar/'];

  assert.deepEqual(buildBaseUrls(reference, node), expected,
    'absolute url overwrites reference');
});

QUnit.module('getSegmentInformation');

QUnit.test('undefined Segment information when no Segment nodes', function(assert) {
  const adaptationSet = { childNodes: [] };
  const expected = {};

  assert.deepEqual(getSegmentInformation(adaptationSet), expected,
    'undefined segment info');
});

QUnit.test('gets SegmentTemplate attributes', function(assert) {
  const adaptationSet = {
    childNodes: [{
      tagName: 'SegmentTemplate',
      attributes: [{ name: 'media', value: 'video.mp4' }],
      childNodes: []
    }]
  };
  const expected = {
    template: { media: 'video.mp4' }
  };

  assert.deepEqual(getSegmentInformation(adaptationSet), expected,
    'SegmentTemplate info');
});

QUnit.test('gets SegmentList attributes', function(assert) {
  const adaptationSet = {
    childNodes: [{
      tagName: 'SegmentList',
      attributes: [{ name: 'duration', value: '10' }],
      childNodes: []
    }]
  };
  const expected = {
    list: {
      duration: 10,
      segmentUrls: [],
      initialization: {}
    }
  };

  assert.deepEqual(getSegmentInformation(adaptationSet), expected,
    'SegmentList info');
});

QUnit.test('gets SegmentBase attributes', function(assert) {
  const adaptationSet = {
    childNodes: [{
      tagName: 'SegmentBase',
      attributes: [{ name: 'duration', value: '10' }],
      childNodes: []
    }]
  };
  const expected = {
    base: { duration: 10, initialization: {} }
  };

  assert.deepEqual(getSegmentInformation(adaptationSet), expected,
    'SegmentBase info');
});

QUnit.test('gets SegmentTemplate and SegmentTimeline attributes', function(assert) {
  const adaptationSet = {
    childNodes: [{
      tagName: 'SegmentTemplate',
      attributes: [{ name: 'media', value: 'video.mp4' }],
      childNodes: [{
        tagName: 'SegmentTimeline',
        childNodes: [{
          tagName: 'S',
          attributes: [{ name: 'd', value: '10' }]
        }, {
          tagName: 'S',
          attributes: [{ name: 'd', value: '5' }]
        }, {
          tagName: 'S',
          attributes: [{ name: 'd', value: '7' }]
        }]
      }]
    }]
  };
  const expected = {
    template: { media: 'video.mp4' },
    timeline: [{ d: 10 }, { d: 5 }, { d: 7 }]
  };

  assert.deepEqual(getSegmentInformation(adaptationSet), expected,
    'SegmentTemplate and SegmentTimeline info');
});

QUnit.module('inheritAttributes');

QUnit.test('needs at least one Period', function(assert) {
  assert.throws(() => inheritAttributes(stringToMpdXml('<MPD></MPD>')),
    new RegExp(errors.INVALID_NUMBER_OF_PERIOD));
});

QUnit.test('end to end - basic', function(assert) {
  const NOW = Date.now();

  const actual = inheritAttributes(stringToMpdXml(
    `
    <MPD mediaPresentationDuration="PT30S" >
      <BaseURL>https://www.example.com/base/</BaseURL>
      <Period>
        <AdaptationSet mimeType="video/mp4" >
          <Role value="main"></Role>
          <SegmentTemplate></SegmentTemplate>
          <Representation
            bandwidth="5000000"
            codecs="avc1.64001e"
            height="404"
            id="test"
            width="720">
          </Representation>
        </AdaptationSet>
        <AdaptationSet mimeType="text/vtt" lang="en">
          <Representation bandwidth="256" id="en">
            <BaseURL>https://example.com/en.vtt</BaseURL>
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
  ), { NOW });

  const expected = [{
    attributes: {
      bandwidth: 5000000,
      baseUrl: 'https://www.example.com/base/',
      codecs: 'avc1.64001e',
      height: 404,
      id: 'test',
      mediaPresentationDuration: 30,
      mimeType: 'video/mp4',
      periodIndex: 0,
      role: {
        value: 'main'
      },
      sourceDuration: 30,
      width: 720,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {
      template: {}
    }
  }, {
    attributes: {
      bandwidth: 256,
      baseUrl: 'https://example.com/en.vtt',
      id: 'en',
      lang: 'en',
      mediaPresentationDuration: 30,
      mimeType: 'text/vtt',
      periodIndex: 0,
      role: {},
      sourceDuration: 30,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {}
  }];

  assert.equal(actual.length, 2);
  assert.deepEqual(actual, expected);
});

QUnit.test('end to end - inherits BaseURL from all levels', function(assert) {
  const NOW = Date.now();

  const actual = inheritAttributes(stringToMpdXml(
    `
    <MPD mediaPresentationDuration="PT30S" >
      <BaseURL>https://www.example.com/base/</BaseURL>
      <Period>
        <BaseURL>foo/</BaseURL>
        <AdaptationSet mimeType="video/mp4" >
          <BaseURL>bar/</BaseURL>
          <Role value="main"></Role>
          <SegmentTemplate></SegmentTemplate>
          <Representation
            bandwidth="5000000"
            codecs="avc1.64001e"
            height="404"
            id="test"
            width="720">
            <BaseURL>buzz/</BaseURL>
          </Representation>
        </AdaptationSet>
        <AdaptationSet mimeType="text/vtt" lang="en">
          <Representation bandwidth="256" id="en">
            <BaseURL>https://example.com/en.vtt</BaseURL>
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
  ), { NOW });

  const expected = [{
    attributes: {
      bandwidth: 5000000,
      baseUrl: 'https://www.example.com/base/foo/bar/buzz/',
      codecs: 'avc1.64001e',
      height: 404,
      id: 'test',
      mediaPresentationDuration: 30,
      mimeType: 'video/mp4',
      periodIndex: 0,
      role: {
        value: 'main'
      },
      sourceDuration: 30,
      width: 720,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {
      template: {}
    }
  }, {
    attributes: {
      bandwidth: 256,
      baseUrl: 'https://example.com/en.vtt',
      id: 'en',
      lang: 'en',
      mediaPresentationDuration: 30,
      mimeType: 'text/vtt',
      periodIndex: 0,
      role: {},
      sourceDuration: 30,
      NOW,
      clientOffset: 0
    },
    segmentInfo: { }
  }];

  assert.equal(actual.length, 2);
  assert.deepEqual(actual, expected);
});

QUnit.test('end to end - alternate BaseURLs', function(assert) {
  const NOW = Date.now();
  const actual = inheritAttributes(stringToMpdXml(
    `
    <MPD mediaPresentationDuration= "PT30S"  >
      <BaseURL>https://www.example.com/base/</BaseURL>
      <BaseURL>https://www.test.com/base/</BaseURL>
      <Period>
        <AdaptationSet mimeType= "video/mp4"  >
          <BaseURL>segments/</BaseURL>
          <BaseURL>media/</BaseURL>
          <Role value= "main" ></Role>
          <SegmentTemplate></SegmentTemplate>
          <Representation
            bandwidth= "5000000"
            codecs= "avc1.64001e"
            height= "404"
            id= "test"
            width= "720" >
          </Representation>
        </AdaptationSet>
        <AdaptationSet mimeType= "text/vtt"  lang= "en" >
          <Representation bandwidth= "256"  id= "en" >
            <BaseURL>https://example.com/en.vtt</BaseURL>
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
  ), { NOW });

  const expected = [{
    attributes: {
      bandwidth: 5000000,
      baseUrl: 'https://www.example.com/base/segments/',
      codecs: 'avc1.64001e',
      height: 404,
      id: 'test',
      mediaPresentationDuration: 30,
      mimeType: 'video/mp4',
      periodIndex: 0,
      role: {
        value: 'main'
      },
      sourceDuration: 30,
      width: 720,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {
      template: {}
    }
  }, {
    attributes: {
      bandwidth: 5000000,
      baseUrl: 'https://www.example.com/base/media/',
      codecs: 'avc1.64001e',
      height: 404,
      id: 'test',
      mediaPresentationDuration: 30,
      mimeType: 'video/mp4',
      periodIndex: 0,
      role: {
        value: 'main'
      },
      sourceDuration: 30,
      width: 720,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {
      template: {}
    }
  }, {
    attributes: {
      bandwidth: 5000000,
      baseUrl: 'https://www.test.com/base/segments/',
      codecs: 'avc1.64001e',
      height: 404,
      id: 'test',
      mediaPresentationDuration: 30,
      mimeType: 'video/mp4',
      periodIndex: 0,
      role: {
        value: 'main'
      },
      sourceDuration: 30,
      width: 720,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {
      template: {}
    }
  }, {
    attributes: {
      bandwidth: 5000000,
      baseUrl: 'https://www.test.com/base/media/',
      codecs: 'avc1.64001e',
      height: 404,
      id: 'test',
      mediaPresentationDuration: 30,
      mimeType: 'video/mp4',
      periodIndex: 0,
      role: {
        value: 'main'
      },
      sourceDuration: 30,
      width: 720,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {
      template: {}
    }
  }, {
    attributes: {
      bandwidth: 256,
      baseUrl: 'https://example.com/en.vtt',
      id: 'en',
      lang: 'en',
      mediaPresentationDuration: 30,
      mimeType: 'text/vtt',
      periodIndex: 0,
      role: {},
      sourceDuration: 30,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {}
  }, {
    attributes: {
      bandwidth: 256,
      baseUrl: 'https://example.com/en.vtt',
      id: 'en',
      lang: 'en',
      mediaPresentationDuration: 30,
      mimeType: 'text/vtt',
      periodIndex: 0,
      role: {},
      sourceDuration: 30,
      NOW,
      clientOffset: 0
    },
    segmentInfo: {}
  }];

  assert.equal(actual.length, 6);
  assert.deepEqual(actual, expected);
});

QUnit.test(' End to End test for checking support of segments in representation',
  function(assert) {
    const NOW = Date.now();
    const actual = inheritAttributes(stringToMpdXml(
      `
    <MPD mediaPresentationDuration= "PT30S"  >
      <BaseURL>https://www.example.com/base/</BaseURL>
      <Period>
        <AdaptationSet mimeType= "video/mp4"  >
          <Role value= "main" ></Role>
          <SegmentBase indexRangeExact= "true"  indexRange= "820-2087" >
              <Initialization range= "0-987" />
          </SegmentBase>

          <Representation
            mimeType= "video/mp6"
            bandwidth= "5000000"
            codecs= "avc1.64001e"
            height= "404"
            id= "test"
            width= "720" >
            <SegmentBase>
              <Initialization range= "0-567" />
            </SegmentBase>
          </Representation>
          <Representation
            height= "545" >
          </Representation>
        </AdaptationSet>
        <AdaptationSet mimeType= "text/vtt"  lang= "en" >
          <Representation bandwidth= "256"  id= "en" >
            <BaseURL>https://example.com/en.vtt</BaseURL>
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
    ), { NOW });

    const expected = [{
      attributes: {
        bandwidth: 5000000,
        baseUrl: 'https://www.example.com/base/',
        codecs: 'avc1.64001e',
        height: 404,
        id: 'test',
        mediaPresentationDuration: 30,
        mimeType: 'video/mp6',
        periodIndex: 0,
        role: {
          value: 'main'
        },
        sourceDuration: 30,
        width: 720,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {
        base: {
          indexRange: '820-2087',
          indexRangeExact: 'true',
          initialization: {
            range: '0-567'
          }
        }
      }
    }, {
      attributes: {
        baseUrl: 'https://www.example.com/base/',
        mediaPresentationDuration: 30,
        mimeType: 'video/mp4',
        periodIndex: 0,
        height: 545,
        role: {
          value: 'main'
        },
        sourceDuration: 30,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {
        base: {
          indexRange: '820-2087',
          indexRangeExact: 'true',
          initialization: {
            range: '0-987'
          }
        }
      }
    }, {
      attributes: {
        bandwidth: 256,
        baseUrl: 'https://example.com/en.vtt',
        id: 'en',
        lang: 'en',
        mediaPresentationDuration: 30,
        mimeType: 'text/vtt',
        periodIndex: 0,
        role: {},
        sourceDuration: 30,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {}
    }];

    assert.equal(actual.length, 3);
    assert.deepEqual(actual, expected);
  });

QUnit.test(' End to End test for checking support of segments in period ',
  function(assert) {
    const NOW = Date.now();
    const actual = inheritAttributes(stringToMpdXml(
      `
    <MPD mediaPresentationDuration= "PT30S"  >
      <BaseURL>https://www.example.com/base/</BaseURL>
      <Period duration= "PT0H4M40.414S" >
        <SegmentBase indexRangeExact= "false"  indexRange= "9999" >
           <Initialization range= "0-1111" />
        </SegmentBase>
        <AdaptationSet mimeType= "video/mp4"  >
          <Role value= "main" ></Role>
          <Representation
            mimeType= "video/mp6"
            bandwidth= "5000000"
            codecs= "avc1.64001e"
            height= "404"
            id= "test"
            width= "720" >
          </Representation>
          <Representation
            height= "545" >
          </Representation>
        </AdaptationSet>
        <AdaptationSet mimeType= "text/vtt"  lang= "en" >
          <Representation bandwidth= "256"  id= "en" >
            <BaseURL>https://example.com/en.vtt</BaseURL>
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
    ), { NOW });

    const expected = [{
      attributes: {
        bandwidth: 5000000,
        baseUrl: 'https://www.example.com/base/',
        duration: 280.414,
        codecs: 'avc1.64001e',
        height: 404,
        id: 'test',
        mediaPresentationDuration: 30,
        mimeType: 'video/mp6',
        periodIndex: 0,
        role: {
          value: 'main'
        },
        sourceDuration: 30,
        width: 720,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {
        base: {
          indexRange: '9999',
          indexRangeExact: 'false',
          initialization: {
            range: '0-1111'
          }
        }
      }
    }, {
      attributes: {
        baseUrl: 'https://www.example.com/base/',
        mediaPresentationDuration: 30,
        duration: 280.414,
        mimeType: 'video/mp4',
        periodIndex: 0,
        height: 545,
        role: {
          value: 'main'
        },
        sourceDuration: 30,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {
        base: {
          indexRange: '9999',
          indexRangeExact: 'false',
          initialization: {
            range: '0-1111'
          }
        }
      }
    }, {
      attributes: {
        bandwidth: 256,
        baseUrl: 'https://example.com/en.vtt',
        duration: 280.414,
        id: 'en',
        lang: 'en',
        mediaPresentationDuration: 30,
        mimeType: 'text/vtt',
        periodIndex: 0,
        role: {},
        sourceDuration: 30,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {
        base: {
          indexRange: '9999',
          indexRangeExact: 'false',
          initialization: {
            range: '0-1111'
          }
        }
      }
    }];

    assert.equal(actual.length, 3);
    assert.deepEqual(actual, expected);
  });

QUnit.test(' End to End test for checking support of Segments in Adaptation set',
  function(assert) {
    const NOW = Date.now();
    const actual = inheritAttributes(stringToMpdXml(
      `
    <MPD mediaPresentationDuration= "PT30S"  >
      <BaseURL>https://www.example.com/base/</BaseURL>
      <Period duration= "PT0H4M40.414S" >
        <AdaptationSet mimeType= "video/mp4"  >
          <Role value= "main" ></Role>
          <SegmentBase indexRange= "1212"  indexRangeExact= "true" >
           <Initialization range= "0-8888"  />
          </SegmentBase>
          <Representation
            mimeType= "video/mp6"
            bandwidth= "5000000"
            codecs= "avc1.64001e"
            height= "404"
            id= "test"
            width= "720" >
          </Representation>
          <Representation
            height= "545" >
          </Representation>
        </AdaptationSet>
        <AdaptationSet mimeType= "text/vtt"  lang= "en" >
          <Representation bandwidth= "256"  id= "en" >
            <BaseURL>https://example.com/en.vtt</BaseURL>
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
    ), { NOW });

    const expected = [{
      attributes: {
        bandwidth: 5000000,
        baseUrl: 'https://www.example.com/base/',
        duration: 280.414,
        codecs: 'avc1.64001e',
        height: 404,
        id: 'test',
        mediaPresentationDuration: 30,
        mimeType: 'video/mp6',
        periodIndex: 0,
        role: {
          value: 'main'
        },
        sourceDuration: 30,
        width: 720,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {
        base: {
          indexRange: '1212',
          indexRangeExact: 'true',
          initialization: {
            range: '0-8888'

          }
        }
      }
    }, {
      attributes: {
        baseUrl: 'https://www.example.com/base/',
        mediaPresentationDuration: 30,
        duration: 280.414,
        mimeType: 'video/mp4',
        periodIndex: 0,
        height: 545,
        role: {
          value: 'main'
        },
        sourceDuration: 30,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {
        base: {
          indexRange: '1212',
          indexRangeExact: 'true',
          initialization: {
            range: '0-8888'
          }
        }
      }
    }, {
      attributes: {
        bandwidth: 256,
        baseUrl: 'https://example.com/en.vtt',
        duration: 280.414,
        id: 'en',
        lang: 'en',
        mediaPresentationDuration: 30,
        mimeType: 'text/vtt',
        periodIndex: 0,
        role: {},
        sourceDuration: 30,
        NOW,
        clientOffset: 0
      },
      segmentInfo: {}
    }];

    assert.equal(actual.length, 3);
    assert.deepEqual(actual, expected);
  });

// Although according to the Spec, at most one set of Segment information should be
// present at each level, this test would still handle the case and prevent errors if
// multiple set of segment information are present at any particular level.

QUnit.test(
  'Test for checking use of only one set of Segment Information when multiple are present',
  function(assert) {
    const NOW = Date.now();
    const actual = toPlaylists(inheritAttributes(stringToMpdXml(
      `
    <MPD mediaPresentationDuration= "PT30S"  >
      <BaseURL>https://www.example.com/base</BaseURL>
      <Period duration= "PT0H4M40.414S" >
        <AdaptationSet
          mimeType= "video/mp4"
          segmentAlignment= "true"
          startWithSAP= "1"
          lang= "es" >
          <Role value= "main" ></Role>
          <SegmentTemplate
            duration= "95232"
            initialization= "$RepresentationID$/es/init.m4f"
            media= "$RepresentationID$/es/$Number$.m4f"
            startNumber= "0"
            timescale= "48000" >
          </SegmentTemplate>
          <SegmentList timescale= "1000"  duration= "1000" >
            <RepresentationIndex sourceURL= "representation-index-low" />
            <SegmentURL media= "low/segment-1.ts" />
            <SegmentURL media= "low/segment-2.ts" />
            <SegmentURL media= "low/segment-3.ts" />
            <SegmentURL media= "low/segment-4.ts" />
            <SegmentURL media= "low/segment-5.ts" />
            <SegmentURL media= "low/segment-6.ts" />
          </SegmentList>
          <Representation
            mimeType= "video/mp6"
            bandwidth= "5000000"
            codecs= "avc1.64001e"
            height= "404"
            id= "125000"
            width= "720" >
          </Representation>
          <Representation
            height= "545"
            id="125000" >
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
    ), { NOW }));

    const expected = [{
      attributes: {
        NOW,
        bandwidth: 5000000,
        baseUrl: 'https://www.example.com/base',
        duration: 1.984,
        codecs: 'avc1.64001e',
        height: 404,
        id: '125000',
        lang: 'es',
        mediaPresentationDuration: 30,
        mimeType: 'video/mp6',
        periodIndex: 0,
        startNumber: 0,
        timescale: 48000,
        role: {
          value: 'main'
        },
        clientOffset: 0,
        initialization: {
          sourceURL: '$RepresentationID$/es/init.m4f'
        },
        media: '$RepresentationID$/es/$Number$.m4f',
        segmentAlignment: 'true',
        sourceDuration: 30,
        width: 720,
        startWithSAP: '1'
      },
      segments: [{
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/0.m4f',
        timeline: 0,
        uri: '125000/es/0.m4f',
        number: 0
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/1.m4f',
        timeline: 0,
        uri: '125000/es/1.m4f',
        number: 1
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/2.m4f',
        timeline: 0,
        uri: '125000/es/2.m4f',
        number: 2
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/3.m4f',
        timeline: 0,
        uri: '125000/es/3.m4f',
        number: 3
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/4.m4f',
        timeline: 0,
        uri: '125000/es/4.m4f',
        number: 4
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/5.m4f',
        timeline: 0,
        uri: '125000/es/5.m4f',
        number: 5
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/6.m4f',
        timeline: 0,
        uri: '125000/es/6.m4f',
        number: 6
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/7.m4f',
        timeline: 0,
        uri: '125000/es/7.m4f',
        number: 7
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/8.m4f',
        timeline: 0,
        uri: '125000/es/8.m4f',
        number: 8
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/9.m4f',
        timeline: 0,
        uri: '125000/es/9.m4f',
        number: 9
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/10.m4f',
        timeline: 0,
        uri: '125000/es/10.m4f',
        number: 10
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/11.m4f',
        timeline: 0,
        uri: '125000/es/11.m4f',
        number: 11
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/12.m4f',
        timeline: 0,
        uri: '125000/es/12.m4f',
        number: 12
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/13.m4f',
        timeline: 0,
        uri: '125000/es/13.m4f',
        number: 13
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/14.m4f',
        timeline: 0,
        uri: '125000/es/14.m4f',
        number: 14
      }, {
        duration: 0.240000000000002,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/15.m4f',
        timeline: 0,
        uri: '125000/es/15.m4f',
        number: 15
      }]
    }, {
      attributes: {
        NOW,
        baseUrl: 'https://www.example.com/base',
        duration: 1.984,
        lang: 'es',
        height: 545,
        id: '125000',
        mediaPresentationDuration: 30,
        mimeType: 'video/mp4',
        periodIndex: 0,
        role: {
          value: 'main'
        },
        segmentAlignment: 'true',
        sourceDuration: 30,
        startWithSAP: '1',
        clientOffset: 0,
        initialization: {
          sourceURL: '$RepresentationID$/es/init.m4f'
        },
        media: '$RepresentationID$/es/$Number$.m4f',
        startNumber: 0,
        timescale: 48000
      },
      segments: [{
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/0.m4f',
        timeline: 0,
        uri: '125000/es/0.m4f',
        number: 0
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/1.m4f',
        timeline: 0,
        uri: '125000/es/1.m4f',
        number: 1
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/2.m4f',
        timeline: 0,
        uri: '125000/es/2.m4f',
        number: 2
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/3.m4f',
        timeline: 0,
        uri: '125000/es/3.m4f',
        number: 3
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/4.m4f',
        timeline: 0,
        uri: '125000/es/4.m4f',
        number: 4
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/5.m4f',
        timeline: 0,
        uri: '125000/es/5.m4f',
        number: 5
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/6.m4f',
        timeline: 0,
        uri: '125000/es/6.m4f',
        number: 6
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/7.m4f',
        timeline: 0,
        uri: '125000/es/7.m4f',
        number: 7
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/8.m4f',
        timeline: 0,
        uri: '125000/es/8.m4f',
        number: 8
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/9.m4f',
        timeline: 0,
        uri: '125000/es/9.m4f',
        number: 9
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/10.m4f',
        timeline: 0,
        uri: '125000/es/10.m4f',
        number: 10
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/11.m4f',
        timeline: 0,
        uri: '125000/es/11.m4f',
        number: 11
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/12.m4f',
        timeline: 0,
        uri: '125000/es/12.m4f',
        number: 12
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/13.m4f',
        timeline: 0,
        uri: '125000/es/13.m4f',
        number: 13
      }, {
        duration: 1.984,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/14.m4f',
        timeline: 0,
        uri: '125000/es/14.m4f',
        number: 14
      }, {
        duration: 0.240000000000002,
        map: {
          resolvedUri: 'https://www.example.com/125000/es/init.m4f',
          uri: '125000/es/init.m4f'
        },
        resolvedUri: 'https://www.example.com/125000/es/15.m4f',
        timeline: 0,
        uri: '125000/es/15.m4f',
        number: 15
      }]
    }];

    assert.equal(actual.length, 2);
    assert.deepEqual(actual, expected);
  });

// Although the Spec states that if SegmentTemplate or SegmentList is present on one
// level of the hierarchy the other one shall not be present on any lower level, this
// test would still handle the case if both are present in the hierarchy and would
// prevent throwing errors.

QUnit.test('Test to check use of either Segment Template or Segment List when both are' +
' present in the hierarchy', function(assert) {
  const NOW = Date.now();
  const actual = toPlaylists(inheritAttributes(stringToMpdXml(
    `
    <MPD mediaPresentationDuration= "PT30S"  >
      <BaseURL>https://www.example.com/base</BaseURL>
      <Period duration= "PT0H4M40.414S" >
        <AdaptationSet
          mimeType= "video/mp4"
          segmentAlignment= "true"
          startWithSAP= "1"
          lang= "es" >
          <Role value= "main" ></Role>
          <SegmentTemplate
            duration= "95232"
            initialization= "$RepresentationID$/es/init.m4f"
            media= "$RepresentationID$/es/$Number$.m4f"
            startNumber= "0"
            timescale= "48000" >
          </SegmentTemplate>
          <Representation
            mimeType= "video/mp6"
            bandwidth= "5000000"
            codecs= "avc1.64001e"
            height= "404"
            id= "125000"
            width= "720" >
            <SegmentList timescale= "1000"  duration= "1000" >
              <RepresentationIndex sourceURL= "representation-index-low" />
              <SegmentURL media= "low/segment-1.ts" />
              <SegmentURL media= "low/segment-2.ts" />
              <SegmentURL media= "low/segment-3.ts" />
              <SegmentURL media= "low/segment-4.ts" />
              <SegmentURL media= "low/segment-5.ts" />
              <SegmentURL media= "low/segment-6.ts" />
            </SegmentList>
          </Representation>
        </AdaptationSet>
      </Period>
    </MPD>
  `
  ), { NOW }));

  const expected = [{
    attributes: {
      NOW,
      clientOffset: 0,
      initialization: {
        sourceURL: '$RepresentationID$/es/init.m4f'
      },
      media: '$RepresentationID$/es/$Number$.m4f',
      bandwidth: 5000000,
      baseUrl: 'https://www.example.com/base',
      duration: 1.984,
      codecs: 'avc1.64001e',
      height: 404,
      id: '125000',
      lang: 'es',
      mediaPresentationDuration: 30,
      mimeType: 'video/mp6',
      periodIndex: 0,
      role: {
        value: 'main'
      },
      segmentAlignment: 'true',
      sourceDuration: 30,
      width: 720,
      startWithSAP: '1',
      startNumber: 0,
      timescale: 48000
    },
    segments: [{
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/0.m4f',
      timeline: 0,
      uri: '125000/es/0.m4f',
      number: 0
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/1.m4f',
      timeline: 0,
      uri: '125000/es/1.m4f',
      number: 1
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/2.m4f',
      timeline: 0,
      uri: '125000/es/2.m4f',
      number: 2
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/3.m4f',
      timeline: 0,
      uri: '125000/es/3.m4f',
      number: 3
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/4.m4f',
      timeline: 0,
      uri: '125000/es/4.m4f',
      number: 4
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/5.m4f',
      timeline: 0,
      uri: '125000/es/5.m4f',
      number: 5
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/6.m4f',
      timeline: 0,
      uri: '125000/es/6.m4f',
      number: 6
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/7.m4f',
      timeline: 0,
      uri: '125000/es/7.m4f',
      number: 7
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/8.m4f',
      timeline: 0,
      uri: '125000/es/8.m4f',
      number: 8
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/9.m4f',
      timeline: 0,
      uri: '125000/es/9.m4f',
      number: 9
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/10.m4f',
      timeline: 0,
      uri: '125000/es/10.m4f',
      number: 10
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/11.m4f',
      timeline: 0,
      uri: '125000/es/11.m4f',
      number: 11
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/12.m4f',
      timeline: 0,
      uri: '125000/es/12.m4f',
      number: 12
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/13.m4f',
      timeline: 0,
      uri: '125000/es/13.m4f',
      number: 13
    }, {
      duration: 1.984,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/14.m4f',
      timeline: 0,
      uri: '125000/es/14.m4f',
      number: 14
    }, {
      duration: 0.240000000000002,
      map: {
        resolvedUri: 'https://www.example.com/125000/es/init.m4f',
        uri: '125000/es/init.m4f'
      },
      resolvedUri: 'https://www.example.com/125000/es/15.m4f',
      timeline: 0,
      uri: '125000/es/15.m4f',
      number: 15
    }]
  }
  ];

  assert.equal(actual.length, 1);
  assert.deepEqual(actual, expected);
});

